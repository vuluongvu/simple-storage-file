import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException } from '@nestjs/common';
import { FilesService } from './files.service.js';
import { FileEntity } from './entities/file.entity.js';
import { FileShareEntity } from '../file-shares/entities/file-share.entity.js';
import { STORAGE_SERVICE } from '../storage/storage.constants.js';
import { FileVisibility } from '../common/enums/file-visibility.enum.js';
import { SharePermission } from '../common/enums/share-permission.enum.js';
import { Readable } from 'stream';

describe('FilesService', () => {
  let service: FilesService;
  let mockFileRepo: any;
  let mockShareRepo: any;
  let mockStorageService: any;

  beforeEach(async () => {
    mockFileRepo = {
      create: vi.fn().mockImplementation((dto) => dto),
      save: vi.fn().mockImplementation((file) => Promise.resolve({ id: 1, ...file })),
      findOne: vi.fn(),
      remove: vi.fn().mockResolvedValue(true),
      createQueryBuilder: vi.fn(),
    };

    mockShareRepo = {
      findOne: vi.fn(),
    };

    mockStorageService = {
      upload: vi.fn().mockResolvedValue({
        storageKey: 'user_1/abc.png',
        originalName: 'abc.png',
        mimeType: 'image/png',
        size: 1024,
      }),
      download: vi.fn().mockResolvedValue({
        stream: Readable.from(['hello']),
        size: 5,
        storageKey: 'user_1/abc.png',
      }),
      delete: vi.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FilesService,
        {
          provide: getRepositoryToken(FileEntity),
          useValue: mockFileRepo,
        },
        {
          provide: getRepositoryToken(FileShareEntity),
          useValue: mockShareRepo,
        },
        {
          provide: STORAGE_SERVICE,
          useValue: mockStorageService,
        },
      ],
    }).compile();

    service = module.get<FilesService>(FilesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('uploadFile', () => {
    it('should upload a file and save metadata', async () => {
      const mockFile = {
        buffer: Buffer.from('test'),
        originalname: 'abc.png',
        mimetype: 'image/png',
        size: 1024,
      } as any;

      const result = await service.uploadFile(1, mockFile);
      expect(result).toBeDefined();
      expect(result.originalName).toBe('abc.png');
      expect(result.visibility).toBe(FileVisibility.PRIVATE);
      expect(mockStorageService.upload).toHaveBeenCalled();
      expect(mockFileRepo.save).toHaveBeenCalled();
    });
  });

  describe('getFileDetails', () => {
    it('should allow owner to access file', async () => {
      mockFileRepo.findOne.mockResolvedValueOnce({
        id: 1,
        userId: 1,
        visibility: FileVisibility.PRIVATE,
      });

      const file = await service.getFileDetails(1, 1);
      expect(file.id).toBe(1);
    });

    it('should allow anyone to access PUBLIC file', async () => {
      mockFileRepo.findOne.mockResolvedValueOnce({
        id: 1,
        userId: 2,
        visibility: FileVisibility.PUBLIC,
      });

      const file = await service.getFileDetails(1, 1);
      expect(file.id).toBe(1);
    });

    it('should allow user with FileShare to access SHARED file', async () => {
      mockFileRepo.findOne.mockResolvedValueOnce({
        id: 1,
        userId: 2,
        visibility: FileVisibility.SHARED,
      });
      mockShareRepo.findOne.mockResolvedValueOnce({
        fileId: 1,
        sharedWithUserId: 1,
        permission: SharePermission.VIEW,
      });

      const file = await service.getFileDetails(1, 1);
      expect(file.id).toBe(1);
    });

    it('should forbid unauthorized user from accessing PRIVATE file', async () => {
      mockFileRepo.findOne.mockResolvedValueOnce({
        id: 1,
        userId: 2,
        visibility: FileVisibility.PRIVATE,
      });

      await expect(service.getFileDetails(1, 1)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('downloadFile', () => {
    it('should allow owner to download', async () => {
      mockFileRepo.findOne.mockResolvedValueOnce({
        id: 1,
        userId: 1,
        storageKey: 'key1',
        visibility: FileVisibility.PRIVATE,
      });

      const result = await service.downloadFile(1, 1);
      expect(result.stream).toBeDefined();
    });

    it('should deny download to shared user with VIEW-only permission', async () => {
      mockFileRepo.findOne.mockResolvedValueOnce({
        id: 1,
        userId: 2,
        storageKey: 'key1',
        visibility: FileVisibility.SHARED,
      });
      mockShareRepo.findOne.mockResolvedValueOnce({
        fileId: 1,
        sharedWithUserId: 1,
        permission: SharePermission.VIEW,
      });

      await expect(service.downloadFile(1, 1)).rejects.toThrow(ForbiddenException);
    });

    it('should allow download to shared user with DOWNLOAD permission', async () => {
      mockFileRepo.findOne.mockResolvedValueOnce({
        id: 1,
        userId: 2,
        storageKey: 'key1',
        visibility: FileVisibility.SHARED,
      });
      mockShareRepo.findOne.mockResolvedValueOnce({
        fileId: 1,
        sharedWithUserId: 1,
        permission: SharePermission.DOWNLOAD,
      });

      const result = await service.downloadFile(1, 1);
      expect(result.stream).toBeDefined();
    });
  });

  describe('deleteFile', () => {
    it('should allow owner to delete file', async () => {
      mockFileRepo.findOne.mockResolvedValueOnce({
        id: 1,
        userId: 1,
        storageKey: 'key1',
      });

      const result = await service.deleteFile(1, 1);
      expect(result).toHaveProperty('message');
      expect(mockStorageService.delete).toHaveBeenCalledWith('key1');
      expect(mockFileRepo.remove).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if non-owner tries to delete', async () => {
      mockFileRepo.findOne.mockResolvedValueOnce({
        id: 1,
        userId: 2,
        storageKey: 'key1',
      });

      await expect(service.deleteFile(1, 1)).rejects.toThrow(ForbiddenException);
    });
  });
});
