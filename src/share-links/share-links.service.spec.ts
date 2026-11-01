import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ShareLinksService } from './share-links.service.js';
import { ShareLinkEntity } from './entities/share-link.entity.js';
import { FileEntity } from '../files/entities/file.entity.js';
import { STORAGE_SERVICE } from '../storage/storage.constants.js';
import { FileVisibility } from '../common/enums/file-visibility.enum.js';
import { Readable } from 'stream';

describe('ShareLinksService', () => {
  let service: ShareLinksService;
  let mockShareLinkRepo: any;
  let mockFileRepo: any;
  let mockStorageService: any;

  beforeEach(async () => {
    mockShareLinkRepo = {
      findOne: vi.fn(),
      find: vi.fn(),
      create: vi.fn().mockImplementation((dto) => dto),
      save: vi.fn().mockImplementation((link) => Promise.resolve({ id: 10, ...link })),
    };

    mockFileRepo = {
      findOne: vi.fn(),
      save: vi.fn().mockImplementation((file) => Promise.resolve(file)),
    };

    mockStorageService = {
      download: vi.fn().mockResolvedValue({
        stream: Readable.from(['public file content']),
        size: 19,
        storageKey: 'public_key',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShareLinksService,
        {
          provide: getRepositoryToken(ShareLinkEntity),
          useValue: mockShareLinkRepo,
        },
        {
          provide: getRepositoryToken(FileEntity),
          useValue: mockFileRepo,
        },
        {
          provide: STORAGE_SERVICE,
          useValue: mockStorageService,
        },
      ],
    }).compile();

    service = module.get<ShareLinksService>(ShareLinksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createShareLink', () => {
    it('should create public link with secure token and set file to PUBLIC', async () => {
      const mockFile = { id: 1, userId: 1, visibility: FileVisibility.PRIVATE };
      mockFileRepo.findOne.mockResolvedValueOnce(mockFile);

      const result = await service.createShareLink(1, 1, { expiresInHours: 24 });
      expect(result).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.token.length).toBe(64); // 32 bytes hex
      expect(result.isActive).toBe(true);
      expect(result.publicUrl).toContain('/api/public/files/');
      expect(mockFile.visibility).toBe(FileVisibility.PUBLIC);
    });

    it('should deny non-owner from creating share links', async () => {
      mockFileRepo.findOne.mockResolvedValueOnce({ id: 1, userId: 2 });

      await expect(service.createShareLink(1, 1, {})).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getPublicFileInfo & downloadPublicFile', () => {
    it('should retrieve public file info when link is active and valid', async () => {
      mockShareLinkRepo.findOne.mockResolvedValueOnce({
        token: 'sample_token',
        isActive: true,
        expiresAt: new Date(Date.now() + 100000),
        file: {
          id: 1,
          originalName: 'report.pdf',
          mimeType: 'application/pdf',
          size: 5000,
          createdAt: new Date(),
        },
      });

      const info = await service.getPublicFileInfo('sample_token');
      expect(info.originalName).toBe('report.pdf');
      expect(info.downloadUrl).toContain('sample_token');
    });

    it('should reject access if share link is inactive', async () => {
      mockShareLinkRepo.findOne.mockResolvedValueOnce({
        token: 'revoked_token',
        isActive: false,
        file: { id: 1 },
      });

      await expect(service.getPublicFileInfo('revoked_token')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should reject access if share link is expired', async () => {
      mockShareLinkRepo.findOne.mockResolvedValueOnce({
        token: 'expired_token',
        isActive: true,
        expiresAt: new Date(Date.now() - 100000), // past
        file: { id: 1 },
      });

      await expect(service.getPublicFileInfo('expired_token')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should stream file for public download', async () => {
      mockShareLinkRepo.findOne.mockResolvedValueOnce({
        token: 'valid_token',
        isActive: true,
        expiresAt: null, // no expiration
        file: { id: 1, storageKey: 'public_key', originalName: 'report.pdf' },
      });

      const result = await service.downloadPublicFile('valid_token');
      expect(result.stream).toBeDefined();
      expect(mockStorageService.download).toHaveBeenCalledWith('public_key');
    });
  });
});
