import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { ShareLinkEntity } from './entities/share-link.entity.js';
import { FileEntity } from '../files/entities/file.entity.js';
import { CreateShareLinkDto } from './dto/create-share-link.dto.js';
import { FileVisibility } from '../common/enums/file-visibility.enum.js';
import { STORAGE_SERVICE } from '../storage/storage.constants.js';
import type { StorageService } from '../storage/interfaces/storage.interface.js';

@Injectable()
export class ShareLinksService {
  constructor(
    @InjectRepository(ShareLinkEntity)
    private readonly shareLinkRepository: Repository<ShareLinkEntity>,
    @InjectRepository(FileEntity)
    private readonly fileRepository: Repository<FileEntity>,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: StorageService,
  ) {}

  async createShareLink(
    fileId: number,
    ownerId: number,
    dto: CreateShareLinkDto,
  ): Promise<ShareLinkEntity & { publicUrl: string; downloadUrl: string }> {
    const file = await this.fileRepository.findOne({ where: { id: fileId } });
    if (!file) {
      throw new NotFoundException(`File with ID ${fileId} not found`);
    }

    if (file.userId !== ownerId) {
      throw new ForbiddenException('Only the file owner can create public share links');
    }

    // Automatically set file visibility to PUBLIC if not already
    if (file.visibility !== FileVisibility.PUBLIC) {
      file.visibility = FileVisibility.PUBLIC;
      await this.fileRepository.save(file);
    }

    // Calculate expiration date
    let expiresAt: Date | null = null;
    if (dto.expiresInHours) {
      expiresAt = new Date(Date.now() + dto.expiresInHours * 3600 * 1000);
    } else if (dto.expiresAt) {
      expiresAt = new Date(dto.expiresAt);
      if (expiresAt.getTime() <= Date.now()) {
        throw new BadRequestException('Expiration date must be in the future');
      }
    }

    // Cryptographically secure token (64 hex characters)
    const token = randomBytes(32).toString('hex');

    const shareLink = this.shareLinkRepository.create({
      fileId,
      token,
      isActive: true,
      expiresAt,
    });

    const saved = await this.shareLinkRepository.save(shareLink);

    return {
      ...saved,
      publicUrl: `/api/public/files/${saved.token}`,
      downloadUrl: `/api/public/files/${saved.token}/download`,
    };
  }

  async getFileShareLinks(
    fileId: number,
    ownerId: number,
  ): Promise<(ShareLinkEntity & { publicUrl: string; downloadUrl: string })[]> {
    const file = await this.fileRepository.findOne({ where: { id: fileId } });
    if (!file) {
      throw new NotFoundException(`File with ID ${fileId} not found`);
    }

    if (file.userId !== ownerId) {
      throw new ForbiddenException('Only the file owner can view share links');
    }

    const links = await this.shareLinkRepository.find({
      where: { fileId },
      order: { createdAt: 'DESC' },
    });

    return links.map((link) => ({
      ...link,
      publicUrl: `/api/public/files/${link.token}`,
      downloadUrl: `/api/public/files/${link.token}/download`,
    }));
  }

  async revokeShareLink(
    fileId: number,
    linkId: number,
    ownerId: number,
  ): Promise<{ message: string }> {
    const file = await this.fileRepository.findOne({ where: { id: fileId } });
    if (!file) {
      throw new NotFoundException(`File with ID ${fileId} not found`);
    }

    if (file.userId !== ownerId) {
      throw new ForbiddenException('Only the file owner can revoke share links');
    }

    const link = await this.shareLinkRepository.findOne({
      where: { id: linkId, fileId },
    });

    if (!link) {
      throw new NotFoundException(`Share link with ID ${linkId} not found for this file`);
    }

    link.isActive = false;
    await this.shareLinkRepository.save(link);

    return { message: 'Share link revoked successfully' };
  }

  private validateLinkStatus(link: ShareLinkEntity) {
    if (!link.isActive) {
      throw new NotFoundException('Share link has been revoked or deactivated');
    }

    if (link.expiresAt && new Date(link.expiresAt).getTime() <= Date.now()) {
      throw new NotFoundException('Share link has expired');
    }

    if (!link.file) {
      throw new NotFoundException('Associated file not found');
    }
  }

  async getPublicFileInfo(token: string) {
    const link = await this.shareLinkRepository.findOne({
      where: { token },
      relations: { file: true },
    });

    if (!link) {
      throw new NotFoundException('Invalid or expired share link');
    }

    this.validateLinkStatus(link);

    return {
      fileId: link.file.id,
      originalName: link.file.originalName,
      mimeType: link.file.mimeType,
      size: link.file.size,
      createdAt: link.file.createdAt,
      expiresAt: link.expiresAt,
      downloadUrl: `/api/public/files/${token}/download`,
    };
  }

  async downloadPublicFile(token: string) {
    const link = await this.shareLinkRepository.findOne({
      where: { token },
      relations: { file: true },
    });

    if (!link) {
      throw new NotFoundException('Invalid or expired share link');
    }

    this.validateLinkStatus(link);

    const downloadResult = await this.storageService.download(link.file.storageKey);

    return {
      file: link.file,
      stream: downloadResult.stream,
    };
  }
}
