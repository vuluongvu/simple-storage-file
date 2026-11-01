import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FolderEntity } from './entities/folder.entity.js';
import { FileEntity } from '../files/entities/file.entity.js';
import { CreateFolderDto } from './dto/create-folder.dto.js';
import { UpdateFolderDto } from './dto/update-folder.dto.js';

@Injectable()
export class FoldersService {
  constructor(
    @InjectRepository(FolderEntity)
    private readonly folderRepository: Repository<FolderEntity>,
    @InjectRepository(FileEntity)
    private readonly fileRepository: Repository<FileEntity>,
  ) {}

  async create(userId: number, dto: CreateFolderDto): Promise<FolderEntity> {
    if (dto.parentId) {
      const parent = await this.folderRepository.findOne({
        where: { id: dto.parentId, userId },
      });
      if (!parent) {
        throw new NotFoundException('Parent folder not found');
      }
    }

    const folder = this.folderRepository.create({
      userId,
      name: dto.name.trim(),
      parentId: dto.parentId || null,
    });

    return this.folderRepository.save(folder);
  }

  async findAll(userId: number, parentId?: number | null) {
    const qb = this.folderRepository
      .createQueryBuilder('folder')
      .where('folder.user_id = :userId', { userId });

    if (parentId !== undefined) {
      if (parentId === null) {
        qb.andWhere('folder.parent_id IS NULL');
      } else {
        qb.andWhere('folder.parent_id = :parentId', { parentId });
      }
    }

    const folders = await qb
      .orderBy('folder.name', 'ASC')
      .getMany();

    // Attach fileCount for each folder
    const folderIds = folders.map((f) => f.id);
    let countsMap: Record<number, number> = {};

    if (folderIds.length > 0) {
      const counts = await this.fileRepository
        .createQueryBuilder('file')
        .select('file.folder_id', 'folderId')
        .addSelect('COUNT(file.id)', 'count')
        .where('file.user_id = :userId', { userId })
        .andWhere('file.folder_id IN (:...folderIds)', { folderIds })
        .groupBy('file.folder_id')
        .getRawMany();

      counts.forEach((c) => {
        countsMap[c.folderId] = Number(c.count);
      });
    }

    return folders.map((f) => ({
      ...f,
      fileCount: countsMap[f.id] || 0,
    }));
  }

  async findOne(userId: number, id: number) {
    const folder = await this.folderRepository.findOne({
      where: { id, userId },
    });

    if (!folder) {
      throw new NotFoundException('Folder not found');
    }

    const breadcrumbs = await this.getBreadcrumbs(userId, id);
    const fileCount = await this.fileRepository.count({
      where: { userId, folderId: id },
    });

    return {
      ...folder,
      fileCount,
      breadcrumbs,
    };
  }

  async getBreadcrumbs(userId: number, folderId: number): Promise<{ id: number; name: string }[]> {
    const crumbs: { id: number; name: string }[] = [];
    let currentId: number | null = folderId;

    while (currentId) {
      const current: FolderEntity | null = await this.folderRepository.findOne({
        where: { id: currentId, userId },
      });
      if (!current) break;
      crumbs.unshift({ id: current.id, name: current.name });
      currentId = current.parentId;
    }

    return crumbs;
  }

  async update(userId: number, id: number, dto: UpdateFolderDto): Promise<FolderEntity> {
    const folder = await this.folderRepository.findOne({
      where: { id, userId },
    });

    if (!folder) {
      throw new NotFoundException('Folder not found');
    }

    folder.name = dto.name.trim();
    return this.folderRepository.save(folder);
  }

  async remove(userId: number, id: number): Promise<{ message: string }> {
    const folder = await this.folderRepository.findOne({
      where: { id, userId },
    });

    if (!folder) {
      throw new NotFoundException('Folder not found');
    }

    await this.folderRepository.remove(folder);
    return { message: 'Folder deleted successfully' };
  }
}
