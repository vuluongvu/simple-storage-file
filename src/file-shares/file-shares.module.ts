import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileSharesController } from './file-shares.controller.js';
import { FileSharesService } from './file-shares.service.js';
import { FileShareEntity } from './entities/file-share.entity.js';
import { FileEntity } from '../files/entities/file.entity.js';
import { UsersModule } from '../users/users.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([FileShareEntity, FileEntity]),
    UsersModule,
  ],
  controllers: [FileSharesController],
  providers: [FileSharesService],
  exports: [FileSharesService],
})
export class FileSharesModule {}
