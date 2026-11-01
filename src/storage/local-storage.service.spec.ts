import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { LocalStorageService } from './local-storage.service.js';
import * as fs from 'fs';
import * as path from 'path';

describe('LocalStorageService', () => {
  let service: LocalStorageService;
  const testUploadDir = './test-uploads';

  beforeEach(async () => {
    const mockConfigService = {
      get: vi.fn().mockImplementation((key: string, defaultValue: any) => {
        if (key === 'UPLOAD_DIR') return testUploadDir;
        return defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalStorageService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<LocalStorageService>(LocalStorageService);
    await service.onModuleInit();
  });

  afterAll(async () => {
    try {
      await fs.promises.rm(path.resolve(process.cwd(), testUploadDir), {
        recursive: true,
        force: true,
      });
    } catch {}
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('upload, download, delete workflow', () => {
    it('should upload a file, download it, and delete it', async () => {
      const buffer = Buffer.from('test file content');
      const file = {
        buffer,
        originalname: 'sample.txt',
        mimetype: 'text/plain',
        size: buffer.length,
      } as any;

      const uploadResult = await service.upload(file, 'test_user');
      expect(uploadResult).toBeDefined();
      expect(uploadResult.storageKey).toContain('.txt');
      expect(uploadResult.size).toBe(buffer.length);

      const downloadResult = await service.download(uploadResult.storageKey);
      expect(downloadResult.stream).toBeDefined();
      expect(downloadResult.size).toBe(buffer.length);

      // Consume stream completely before deleting
      await new Promise<void>((resolve, reject) => {
        downloadResult.stream.on('data', () => {});
        downloadResult.stream.on('end', () => resolve());
        downloadResult.stream.on('error', reject);
      });

      await service.delete(uploadResult.storageKey);

      await expect(service.download(uploadResult.storageKey)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should prevent path traversal attempts', async () => {
      await expect(service.download('../../etc/passwd')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should generate a local presigned URL', async () => {
      const url = await service.getPresignedUrl('user_1/file.pdf', 3600);
      expect(url).toContain('user_1%2Ffile.pdf');
    });
  });
});
