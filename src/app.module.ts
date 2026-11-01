import { MiddlewareConsumer, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import Joi from 'joi';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { UsersModule } from './users/users.module.js';
import { AuthModule } from './auth/auth.module.js';
import { StorageModule } from './storage/storage.module.js';
import { FilesModule } from './files/files.module.js';
import { FileSharesModule } from './file-shares/file-shares.module.js';
import { ShareLinksModule } from './share-links/share-links.module.js';
import { FoldersModule } from './folders/folders.module.js';

import { User } from './users/entities/user.entity.js';
import { FileEntity } from './files/entities/file.entity.js';
import { FileShareEntity } from './file-shares/entities/file-share.entity.js';
import { ShareLinkEntity } from './share-links/entities/share-link.entity.js';
import { FolderEntity } from './folders/entities/folder.entity.js';

import { JwtAuthGuard } from './auth/guards/jwt-auth.guard.js';
import { RolesGuard } from './auth/guards/roles.guard.js';
import { TransformInterceptor } from './common/interceptors/transform.interceptor.js';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor.js';
import { AllExceptionsFilter } from './common/exception-filters/all-exceptions-filter.filter.js';
import { RequestMiddleware } from './common/middleware/request-id.middleware.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        PORT: Joi.number().default(3000),
        NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
        DB_HOST: Joi.string().required(),
        DB_PORT: Joi.number().port().required(),
        DB_USERNAME: Joi.string().required(),
        DB_PASSWORD: Joi.string().allow('').required(),
        DB_NAME: Joi.string().required(),
        JWT_SECRET: Joi.string().min(32).required(),
        JWT_EXPIRATION: Joi.string().default('24h').required(),
        UPLOAD_DIR: Joi.string().default('./uploads'),
        STORAGE_DRIVER: Joi.string().valid('local', 's3').default('local'),
        MAX_FILE_SIZE_MB: Joi.number().default(50),
        AWS_REGION: Joi.string().allow('').optional(),
        AWS_BUCKET_NAME: Joi.string().allow('').optional(),
        AWS_ACCESS_KEY_ID: Joi.string().allow('').optional(),
        AWS_SECRET_ACCESS_KEY: Joi.string().allow('').optional(),
      }),
    }),

    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 200, // 200 requests per minute
      },
    ]),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.getOrThrow<string>('DB_HOST'),
        port: configService.getOrThrow<number>('DB_PORT'),
        username: configService.getOrThrow<string>('DB_USERNAME'),
        password: configService.getOrThrow<string>('DB_PASSWORD'),
        database: configService.getOrThrow<string>('DB_NAME'),
        entities: [User, FileEntity, FileShareEntity, ShareLinkEntity, FolderEntity],
        autoLoadEntities: true,
        synchronize: false, // Use migrations instead of synchronize
      }),
    }),

    StorageModule,
    UsersModule,
    AuthModule,
    FileSharesModule,
    FilesModule,
    ShareLinksModule,
    FoldersModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestMiddleware).forRoutes('*');
  }
}
