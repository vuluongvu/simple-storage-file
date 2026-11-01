import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DownloadResult,
  StorageService,
  UploadFileOptions,
  UploadResult,
} from './interfaces/storage.interface.js';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

@Injectable()
export class LocalStorageService implements StorageService, OnModuleInit {
  private readonly logger = new Logger(LocalStorageService.name);
  private readonly baseUploadDir: string;

  constructor(private readonly configService: ConfigService) {
    const configuredDir = this.configService.get<string>(
      'UPLOAD_DIR',
      './uploads',
    );
    this.baseUploadDir = path.resolve(process.cwd(), configuredDir);
  }

  async onModuleInit() {
    try {
      await fs.promises.mkdir(this.baseUploadDir, { recursive: true });
      this.logger.log(`Local storage directory ready at: ${this.baseUploadDir}`);
    } catch (err) {
      this.logger.error('Failed to initialize local upload directory', err);
    }
  }

  private sanitizeFilename(filename: string): string {
    return path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
  }

  private getSafePath(storageKey: string): string {
    const resolvedPath = path.resolve(this.baseUploadDir, storageKey);
    // Security check: ensure path does not escape baseUploadDir (directory traversal defense)
    if (!resolvedPath.startsWith(this.baseUploadDir)) {
      throw new BadRequestException('Invalid storage key or path traversal attempt');
    }
    return resolvedPath;
  }

  async upload(
    file: Express.Multer.File | UploadFileOptions,
    subDirectory: string = '',
  ): Promise<UploadResult> {
    const sanitizedOriginal = this.sanitizeFilename(file.originalname);
    const ext = path.extname(sanitizedOriginal).toLowerCase();
    const uniqueFileName = `${randomUUID()}${ext}`;
    const storageKey = subDirectory ? path.join(subDirectory, uniqueFileName).replace(/\\/g, '/') : uniqueFileName;
    const targetPath = this.getSafePath(storageKey);

    await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.promises.writeFile(targetPath, file.buffer);

    return {
      storageKey,
      size: file.size,
      mimeType: file.mimetype || 'application/octet-stream',
      originalName: sanitizedOriginal,
    };
  }

  async download(storageKey: string): Promise<DownloadResult> {
    const targetPath = this.getSafePath(storageKey);

    try {
      await fs.promises.access(targetPath, fs.constants.R_OK);
    } catch {
      throw new NotFoundException(`File not found in storage: ${storageKey}`);
    }

    const stat = await fs.promises.stat(targetPath);
    const stream = fs.createReadStream(targetPath);

    return {
      stream,
      size: stat.size,
      storageKey,
    };
  }

  async delete(storageKey: string): Promise<void> {
    const targetPath = this.getSafePath(storageKey);

    try {
      await fs.promises.unlink(targetPath);
    } catch (err: any) {
      if (err.code !== 'ENOENT') {
        this.logger.warn(`Could not delete file ${storageKey}: ${err.message}`);
      }
    }
  }

  async getPresignedUrl(
    storageKey: string,
    expiresInSeconds: number = 3600,
  ): Promise<string> {
    // For local storage, returns the direct download path with signed/presigned capability
    return `/api/files/direct/${encodeURIComponent(storageKey)}?expiresIn=${expiresInSeconds}`;
  }
}
