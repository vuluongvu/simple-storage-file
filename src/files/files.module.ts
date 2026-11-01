import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FilesController } from './files.controller.js';
import { FilesService } from './files.service.js';
import { FileEntity } from './entities/file.entity.js';
import { FileShareEntity } from '../file-shares/entities/file-share.entity.js';
import { StorageModule } from '../storage/storage.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([FileEntity, FileShareEntity]),
    StorageModule,
  ],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}
