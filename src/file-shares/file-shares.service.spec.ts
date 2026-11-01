import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { FileSharesService } from './file-shares.service.js';
import { FileShareEntity } from './entities/file-share.entity.js';
import { FileEntity } from '../files/entities/file.entity.js';
import { UsersService } from '../users/users.service.js';
import { SharePermission } from '../common/enums/share-permission.enum.js';
import { FileVisibility } from '../common/enums/file-visibility.enum.js';

describe('FileSharesService', () => {
  let service: FileSharesService;
  let mockShareRepo: any;
  let mockFileRepo: any;
  let mockUsersService: any;

  beforeEach(async () => {
    mockShareRepo = {
      findOne: vi.fn(),
      find: vi.fn(),
      create: vi.fn().mockImplementation((dto) => dto),
      save: vi.fn().mockImplementation((share) => Promise.resolve({ id: 10, ...share })),
      remove: vi.fn().mockResolvedValue(true),
    };

    mockFileRepo = {
      findOne: vi.fn(),
      save: vi.fn().mockImplementation((file) => Promise.resolve(file)),
      createQueryBuilder: vi.fn(),
    };

    mockUsersService = {
      findByEmail: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileSharesService,
        {
          provide: getRepositoryToken(FileShareEntity),
          useValue: mockShareRepo,
        },
        {
          provide: getRepositoryToken(FileEntity),
          useValue: mockFileRepo,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    service = module.get<FileSharesService>(FileSharesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('shareFile', () => {
    it('should throw NotFoundException if file does not exist', async () => {
      mockFileRepo.findOne.mockResolvedValueOnce(null);

      await expect(
        service.shareFile(1, 1, { email: 'bob@example.com', permission: SharePermission.VIEW }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not file owner', async () => {
      mockFileRepo.findOne.mockResolvedValueOnce({ id: 1, userId: 2 });

      await expect(
        service.shareFile(1, 1, { email: 'bob@example.com', permission: SharePermission.VIEW }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if owner shares with themselves', async () => {
      mockFileRepo.findOne.mockResolvedValueOnce({ id: 1, userId: 1 });
      mockUsersService.findByEmail.mockResolvedValueOnce({ id: 1, email: 'owner@example.com' });

      await expect(
        service.shareFile(1, 1, { email: 'owner@example.com', permission: SharePermission.VIEW }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should share file successfully and set file visibility to SHARED', async () => {
      const mockFile = { id: 1, userId: 1, visibility: FileVisibility.PRIVATE };
      mockFileRepo.findOne.mockResolvedValueOnce(mockFile);
      mockUsersService.findByEmail.mockResolvedValueOnce({ id: 2, email: 'bob@example.com' });
      mockShareRepo.findOne.mockResolvedValueOnce(null);

      const result = await service.shareFile(1, 1, {
        email: 'bob@example.com',
        permission: SharePermission.DOWNLOAD,
      });

      expect(result).toBeDefined();
      expect(result.permission).toBe(SharePermission.DOWNLOAD);
      expect(mockFile.visibility).toBe(FileVisibility.SHARED);
    });
  });

  describe('revokeFileShare', () => {
    it('should revoke share if user is owner', async () => {
      mockFileRepo.findOne.mockResolvedValueOnce({ id: 1, userId: 1 });
      mockShareRepo.findOne.mockResolvedValueOnce({ id: 5, fileId: 1 });

      const result = await service.revokeFileShare(1, 5, 1);
      expect(result).toHaveProperty('message');
      expect(mockShareRepo.remove).toHaveBeenCalled();
    });
  });
});
