import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileShareEntity } from './entities/file-share.entity.js';
import { FileEntity } from '../files/entities/file.entity.js';
import { UsersService } from '../users/users.service.js';
import { CreateFileShareDto } from './dto/create-file-share.dto.js';
import { UpdateFileShareDto } from './dto/update-file-share.dto.js';
import { FileVisibility } from '../common/enums/file-visibility.enum.js';

@Injectable()
export class FileSharesService {
  constructor(
    @InjectRepository(FileShareEntity)
    private readonly fileShareRepository: Repository<FileShareEntity>,
    @InjectRepository(FileEntity)
    private readonly fileRepository: Repository<FileEntity>,
    private readonly usersService: UsersService,
  ) {}

  async shareFile(
    fileId: number,
    ownerId: number,
    dto: CreateFileShareDto,
  ): Promise<FileShareEntity> {
    const file = await this.fileRepository.findOne({ where: { id: fileId } });
    if (!file) {
      throw new NotFoundException(`File with ID ${fileId} not found`);
    }

    if (file.userId !== ownerId) {
      throw new ForbiddenException('Only the file owner can share this file');
    }

    const targetUser = await this.usersService.findByEmail(dto.email);
    if (!targetUser) {
      throw new NotFoundException(`User with email "${dto.email}" not found`);
    }

    if (targetUser.id === ownerId) {
      throw new BadRequestException('You cannot share a file with yourself');
    }

    let share = await this.fileShareRepository.findOne({
      where: { fileId, sharedWithUserId: targetUser.id },
      relations: { sharedWithUser: true },
    });

    if (share) {
      share.permission = dto.permission;
      return this.fileShareRepository.save(share);
    }

    // Automatically set file visibility to SHARED if it was PRIVATE
    if (file.visibility === FileVisibility.PRIVATE) {
      file.visibility = FileVisibility.SHARED;
      await this.fileRepository.save(file);
    }

    share = this.fileShareRepository.create({
      fileId,
      sharedWithUserId: targetUser.id,
      permission: dto.permission,
    });

    const saved = await this.fileShareRepository.save(share);
    saved.sharedWithUser = targetUser;
    return saved;
  }

  async getFileShares(fileId: number, ownerId: number): Promise<FileShareEntity[]> {
    const file = await this.fileRepository.findOne({ where: { id: fileId } });
    if (!file) {
      throw new NotFoundException(`File with ID ${fileId} not found`);
    }

    if (file.userId !== ownerId) {
      throw new ForbiddenException('Only the file owner can view shares for this file');
    }

    return this.fileShareRepository.find({
      where: { fileId },
      relations: { sharedWithUser: true },
      order: { createdAt: 'DESC' },
    });
  }

  async updateFileShare(
    fileId: number,
    shareId: number,
    ownerId: number,
    dto: UpdateFileShareDto,
  ): Promise<FileShareEntity> {
    const file = await this.fileRepository.findOne({ where: { id: fileId } });
    if (!file) {
      throw new NotFoundException(`File with ID ${fileId} not found`);
    }

    if (file.userId !== ownerId) {
      throw new ForbiddenException('Only the file owner can modify file shares');
    }

    const share = await this.fileShareRepository.findOne({
      where: { id: shareId, fileId },
      relations: { sharedWithUser: true },
    });

    if (!share) {
      throw new NotFoundException(`Share with ID ${shareId} not found for this file`);
    }

    share.permission = dto.permission;
    return this.fileShareRepository.save(share);
  }

  async revokeFileShare(
    fileId: number,
    shareId: number,
    ownerId: number,
  ): Promise<{ message: string }> {
    const file = await this.fileRepository.findOne({ where: { id: fileId } });
    if (!file) {
      throw new NotFoundException(`File with ID ${fileId} not found`);
    }

    if (file.userId !== ownerId) {
      throw new ForbiddenException('Only the file owner can revoke file shares');
    }

    const share = await this.fileShareRepository.findOne({
      where: { id: shareId, fileId },
    });

    if (!share) {
      throw new NotFoundException(`Share with ID ${shareId} not found for this file`);
    }

    await this.fileShareRepository.remove(share);
    return { message: 'Share access revoked successfully' };
  }

  async getFilesSharedWithMe(userId: number) {
    const shares = await this.fileShareRepository.find({
      where: { sharedWithUserId: userId },
      relations: { file: { user: true } },
      order: { createdAt: 'DESC' },
    });

    return shares.map((s) => ({
      shareId: s.id,
      permission: s.permission,
      sharedAt: s.createdAt,
      file: s.file,
    }));
  }

  async getFilesSharedByMe(userId: number) {
    const files = await this.fileRepository
      .createQueryBuilder('file')
      .innerJoinAndSelect('file.shares', 'share')
      .innerJoinAndSelect('share.sharedWithUser', 'sharedWithUser')
      .where('file.user_id = :userId', { userId })
      .orderBy('file.created_at', 'DESC')
      .getMany();

    return files;
  }
}
