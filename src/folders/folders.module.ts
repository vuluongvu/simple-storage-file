import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FolderEntity } from './entities/folder.entity.js';
import { FileEntity } from '../files/entities/file.entity.js';
import { FoldersService } from './folders.service.js';
import { FoldersController } from './folders.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([FolderEntity, FileEntity])],
  controllers: [FoldersController],
  providers: [FoldersService],
  exports: [FoldersService],
})
export class FoldersModule {}
