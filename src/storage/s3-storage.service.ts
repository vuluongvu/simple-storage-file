import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  DownloadResult,
  StorageService,
  UploadFileOptions,
  UploadResult,
} from './interfaces/storage.interface.js';
import { randomUUID } from 'crypto';
import * as path from 'path';
import { Readable } from 'stream';

@Injectable()
export class S3StorageService implements StorageService {
  private readonly logger = new Logger(S3StorageService.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;

  constructor(private readonly configService: ConfigService) {
    const region = this.configService.get<string>('AWS_REGION', 'us-east-1');
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID', '');
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY', '');
    this.bucketName = this.configService.get<string>('AWS_BUCKET_NAME', 'my-file-storage-bucket');

    this.s3Client = new S3Client({
      region,
      credentials: accessKeyId && secretAccessKey
        ? { accessKeyId, secretAccessKey }
        : undefined,
    });
  }

  private sanitizeFilename(filename: string): string {
    return path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
  }

  async upload(
    file: Express.Multer.File | UploadFileOptions,
    subDirectory: string = '',
  ): Promise<UploadResult> {
    const sanitizedOriginal = this.sanitizeFilename(file.originalname);
    const ext = path.extname(sanitizedOriginal).toLowerCase();
    const uniqueFileName = `${randomUUID()}${ext}`;
    const storageKey = subDirectory ? `${subDirectory}/${uniqueFileName}` : uniqueFileName;

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: storageKey,
          Body: file.buffer,
          ContentType: file.mimetype || 'application/octet-stream',
          Metadata: {
            originalName: sanitizedOriginal,
          },
        }),
      );

      return {
        storageKey,
        size: file.size,
        mimeType: file.mimetype || 'application/octet-stream',
        originalName: sanitizedOriginal,
      };
    } catch (err: any) {
      this.logger.error(`Failed to upload file to S3: ${err.message}`, err.stack);
      throw new InternalServerErrorException('Failed to upload file to S3 storage');
    }
  }

  async download(storageKey: string): Promise<DownloadResult> {
    try {
      const response = await this.s3Client.send(
        new GetObjectCommand({
          Bucket: this.bucketName,
          Key: storageKey,
        }),
      );

      return {
        stream: response.Body as Readable,
        mimeType: response.ContentType,
        size: response.ContentLength,
        storageKey,
      };
    } catch (err: any) {
      if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
        throw new NotFoundException(`File not found in S3: ${storageKey}`);
      }
      this.logger.error(`Failed to download file from S3: ${err.message}`);
      throw new InternalServerErrorException('Failed to retrieve file from S3');
    }
  }

  async delete(storageKey: string): Promise<void> {
    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: storageKey,
        }),
      );
    } catch (err: any) {
      this.logger.warn(`Failed to delete object from S3: ${err.message}`);
    }
  }

  async getPresignedUrl(
    storageKey: string,
    expiresInSeconds: number = 3600,
  ): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: storageKey,
      });
      return await getSignedUrl(this.s3Client, command, { expiresIn: expiresInSeconds });
    } catch (err: any) {
      this.logger.error(`Failed to generate presigned S3 URL: ${err.message}`);
      throw new InternalServerErrorException('Failed to generate presigned URL');
    }
  }
}
