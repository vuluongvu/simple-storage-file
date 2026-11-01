import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShareLinksController } from './share-links.controller.js';
import { PublicFilesController } from './public-files.controller.js';
import { ShareLinksService } from './share-links.service.js';
import { ShareLinkEntity } from './entities/share-link.entity.js';
import { FileEntity } from '../files/entities/file.entity.js';
import { StorageModule } from '../storage/storage.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([ShareLinkEntity, FileEntity]),
    StorageModule,
  ],
  controllers: [ShareLinksController, PublicFilesController],
  providers: [ShareLinksService],
  exports: [ShareLinksService],
})
export class ShareLinksModule {}
