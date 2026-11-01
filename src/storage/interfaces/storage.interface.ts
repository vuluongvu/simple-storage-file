import { Readable } from 'stream';

export interface UploadFileOptions {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

export interface UploadResult {
  storageKey: string;
  size: number;
  mimeType: string;
  originalName: string;
}

export interface DownloadResult {
  stream: Readable;
  mimeType?: string;
  size?: number;
  storageKey: string;
}

export interface StorageService {
  upload(
    file: Express.Multer.File | UploadFileOptions,
    subDirectory?: string,
  ): Promise<UploadResult>;
  download(storageKey: string): Promise<DownloadResult>;
  delete(storageKey: string): Promise<void>;
  getPresignedUrl(
    storageKey: string,
    expiresInSeconds?: number,
  ): Promise<string>;
}
