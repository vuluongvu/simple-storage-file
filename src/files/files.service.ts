import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileEntity } from './entities/file.entity.js';
import { FileShareEntity } from '../file-shares/entities/file-share.entity.js';
import { STORAGE_SERVICE } from '../storage/storage.constants.js';
import type { StorageService } from '../storage/interfaces/storage.interface.js';
import { FileQueryDto } from './dto/file-query.dto.js';
import { FileVisibility } from '../common/enums/file-visibility.enum.js';
import { SharePermission } from '../common/enums/share-permission.enum.js';

@Injectable()
export class FilesService {
  constructor(
    @InjectRepository(FileEntity)
    private readonly fileRepository: Repository<FileEntity>,
    @InjectRepository(FileShareEntity)
    private readonly fileShareRepository: Repository<FileShareEntity>,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: StorageService,
  ) {}

  async uploadFile(
    userId: number,
    file?: Express.Multer.File,
    visibility: FileVisibility = FileVisibility.PRIVATE,
    folderId?: number | null,
  ): Promise<FileEntity> {
    if (!file) {
      throw new BadRequestException('No file provided for upload');
    }

    const uploadResult = await this.storageService.upload(file, `user_${userId}`);

    const fileEntity = this.fileRepository.create({
      userId,
      originalName: uploadResult.originalName,
      storageKey: uploadResult.storageKey,
      mimeType: uploadResult.mimeType,
      size: uploadResult.size,
      visibility: visibility || FileVisibility.PRIVATE,
      folderId: folderId || null,
    });

    return this.fileRepository.save(fileEntity);
  }

  async findUserFiles(userId: number, query: FileQueryDto) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 10));
    const skip = (page - 1) * limit;

    const qb = this.fileRepository
      .createQueryBuilder('file')
      .leftJoinAndSelect('file.folder', 'folder')
      .where('file.user_id = :userId', { userId });

    if (query.search) {
      qb.andWhere('file.original_name LIKE :search', {
        search: `%${query.search.trim()}%`,
      });
    }

    if (query.visibility) {
      qb.andWhere('file.visibility = :visibility', {
        visibility: query.visibility,
      });
    }

    if (query.folderId !== undefined && query.folderId !== '') {
      if (query.folderId === 'root' || query.folderId === 'null') {
        qb.andWhere('file.folder_id IS NULL');
      } else {
        const fId = parseInt(query.folderId, 10);
        if (!isNaN(fId)) {
          qb.andWhere('file.folder_id = :folderId', { folderId: fId });
        }
      }
    }

    qb.orderBy('file.created_at', 'DESC')
      .skip(skip)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();

    // Overall user storage statistics
    const statsResult = await this.fileRepository
      .createQueryBuilder('file')
      .select('COUNT(file.id)', 'totalFiles')
      .addSelect('COALESCE(SUM(file.size), 0)', 'totalStorageBytes')
      .where('file.user_id = :userId', { userId })
      .getRawOne();

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
      statistics: {
        totalFiles: Number(statsResult?.totalFiles || 0),
        totalStorageBytes: Number(statsResult?.totalStorageBytes || 0),
      },
    };
  }

  async getFileDetails(fileId: number, userId: number): Promise<FileEntity> {
    const file = await this.fileRepository.findOne({
      where: { id: fileId },
      relations: { user: true, folder: true },
    });

    if (!file) {
      throw new NotFoundException(`File with ID ${fileId} not found`);
    }

    // Owner always has access
    if (file.userId === userId) {
      return file;
    }

    // Public file can be accessed
    if (file.visibility === FileVisibility.PUBLIC) {
      return file;
    }

    // Shared file: verify user is in FileShares
    if (file.visibility === FileVisibility.SHARED) {
      const share = await this.fileShareRepository.findOne({
        where: { fileId, sharedWithUserId: userId },
      });

      if (share) {
        return file;
      }
    }

    throw new ForbiddenException('You do not have permission to access this file');
  }

  async downloadFile(fileId: number, userId: number) {
    const file = await this.fileRepository.findOne({ where: { id: fileId } });

    if (!file) {
      throw new NotFoundException(`File with ID ${fileId} not found`);
    }

    if (file.userId !== userId) {
      if (file.visibility === FileVisibility.PUBLIC) {
        // Public allows download
      } else if (file.visibility === FileVisibility.SHARED) {
        const share = await this.fileShareRepository.findOne({
          where: { fileId, sharedWithUserId: userId },
        });

        if (!share) {
          throw new ForbiddenException('You do not have permission to access this file');
        }

        if (share.permission !== SharePermission.DOWNLOAD) {
          throw new ForbiddenException(
            'You only have VIEW permission. Download is not permitted for this file.',
          );
        }
      } else {
        throw new ForbiddenException('You do not have permission to access this file');
      }
    }

    const downloadResult = await this.storageService.download(file.storageKey);

    return {
      file,
      stream: downloadResult.stream,
    };
  }

  async previewFile(fileId: number, userId: number) {
    const file = await this.fileRepository.findOne({ where: { id: fileId } });

    if (!file) {
      throw new NotFoundException(`File with ID ${fileId} not found`);
    }

    if (file.userId !== userId) {
      if (file.visibility === FileVisibility.PUBLIC) {
        // Public allows preview
      } else if (file.visibility === FileVisibility.SHARED) {
        const share = await this.fileShareRepository.findOne({
          where: { fileId, sharedWithUserId: userId },
        });

        if (!share) {
          throw new ForbiddenException('You do not have permission to access this file');
        }
      } else {
        throw new ForbiddenException('You do not have permission to access this file');
      }
    }

    const downloadResult = await this.storageService.download(file.storageKey);

    return {
      file,
      stream: downloadResult.stream,
    };
  }

  async deleteFile(fileId: number, userId: number): Promise<{ message: string }> {
    const file = await this.fileRepository.findOne({ where: { id: fileId } });

    if (!file) {
      throw new NotFoundException(`File with ID ${fileId} not found`);
    }

    if (file.userId !== userId) {
      throw new ForbiddenException('Only the file owner can delete this file');
    }

    // Delete physically from storage
    await this.storageService.delete(file.storageKey);

    // Delete database entity (cascades shares and links)
    await this.fileRepository.remove(file);

    return { message: 'File deleted successfully' };
  }

  async updateVisibility(
    fileId: number,
    userId: number,
    visibility: FileVisibility,
  ): Promise<FileEntity> {
    const file = await this.fileRepository.findOne({ where: { id: fileId } });

    if (!file) {
      throw new NotFoundException(`File with ID ${fileId} not found`);
    }

    if (file.userId !== userId) {
      throw new ForbiddenException('Only the file owner can change its visibility');
    }

    file.visibility = visibility;
    return this.fileRepository.save(file);
  }

  async moveFileToFolder(
    userId: number,
    fileId: number,
    folderId: number | null,
  ): Promise<FileEntity> {
    const file = await this.fileRepository.findOne({ where: { id: fileId } });

    if (!file) {
      throw new NotFoundException(`File with ID ${fileId} not found`);
    }

    if (file.userId !== userId) {
      throw new ForbiddenException('Only the file owner can move this file');
    }

    file.folderId = folderId;
    return this.fileRepository.save(file);
  }
}
