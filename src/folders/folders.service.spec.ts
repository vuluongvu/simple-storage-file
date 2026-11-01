import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { FoldersService } from './folders.service.js';
import { FolderEntity } from './entities/folder.entity.js';
import { FileEntity } from '../files/entities/file.entity.js';

describe('FoldersService', () => {
  let service: FoldersService;
  let folderRepo: any;
  let fileRepo: any;

  const mockFolderRepo = {
    create: vi.fn(),
    save: vi.fn(),
    findOne: vi.fn(),
    remove: vi.fn(),
    createQueryBuilder: vi.fn(),
  };

  const mockFileRepo = {
    count: vi.fn(),
    createQueryBuilder: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FoldersService,
        {
          provide: getRepositoryToken(FolderEntity),
          useValue: mockFolderRepo,
        },
        {
          provide: getRepositoryToken(FileEntity),
          useValue: mockFileRepo,
        },
      ],
    }).compile();

    service = module.get<FoldersService>(FoldersService);
    folderRepo = module.get(getRepositoryToken(FolderEntity));
    fileRepo = module.get(getRepositoryToken(FileEntity));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a root folder', async () => {
    const dto = { name: 'New Folder' };
    const created = { id: 1, userId: 1, name: 'New Folder', parentId: null };

    folderRepo.create.mockReturnValue(created);
    folderRepo.save.mockResolvedValue(created);

    const result = await service.create(1, dto);
    expect(result).toEqual(created);
    expect(folderRepo.create).toHaveBeenCalledWith({
      userId: 1,
      name: 'New Folder',
      parentId: null,
    });
  });

  it('should update a folder name', async () => {
    const existing = { id: 1, userId: 1, name: 'Old' };
    folderRepo.findOne.mockResolvedValue(existing);
    folderRepo.save.mockImplementation((f: any) => Promise.resolve(f));

    const result = await service.update(1, 1, { name: 'Renamed' });
    expect(result.name).toBe('Renamed');
  });

  it('should remove a folder', async () => {
    const existing = { id: 1, userId: 1, name: 'ToDelete' };
    folderRepo.findOne.mockResolvedValue(existing);
    folderRepo.remove.mockResolvedValue(existing);

    const result = await service.remove(1, 1);
    expect(result).toEqual({ message: 'Folder deleted successfully' });
  });
});
