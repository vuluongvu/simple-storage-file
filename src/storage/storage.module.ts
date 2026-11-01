import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LocalStorageService } from './local-storage.service.js';
import { S3StorageService } from './s3-storage.service.js';
import { STORAGE_SERVICE } from './storage.constants.js';

@Global()
@Module({
  providers: [
    LocalStorageService,
    S3StorageService,
    {
      provide: STORAGE_SERVICE,
      useFactory: (
        configService: ConfigService,
        localStorage: LocalStorageService,
        s3Storage: S3StorageService,
      ) => {
        const driver = configService.get<string>('STORAGE_DRIVER', 'local').toLowerCase();
        if (driver === 's3') {
          return s3Storage;
        }
        return localStorage;
      },
      inject: [ConfigService, LocalStorageService, S3StorageService],
    },
  ],
  exports: [STORAGE_SERVICE, LocalStorageService, S3StorageService],
})
export class StorageModule {}
