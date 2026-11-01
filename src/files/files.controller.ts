import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { FilesService } from './files.service.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy.js';
import { FileQueryDto } from './dto/file-query.dto.js';
import { UpdateVisibilityDto } from './dto/update-visibility.dto.js';
import { UploadFileDto } from './dto/upload-file.dto.js';

@ApiTags('Files')
@ApiBearerAuth('bearer')
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload a new file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'The file to upload',
        },
        visibility: {
          type: 'string',
          enum: ['PRIVATE', 'SHARED', 'PUBLIC'],
          description: 'Initial visibility mode',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  @ApiResponse({ status: 400, description: 'No file provided or invalid file' })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB maximum
      },
    }),
  )
  async upload(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadFileDto,
  ) {
    return this.filesService.uploadFile(user.userId, file, dto.visibility);
  }

  @Get()
  @ApiOperation({ summary: 'Get list of files owned by current user with search, filter, and pagination' })
  @ApiResponse({ status: 200, description: 'Files list and statistics retrieved' })
  async getFiles(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: FileQueryDto,
  ) {
    return this.filesService.findUserFiles(user.userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get file details by ID' })
  @ApiParam({ name: 'id', description: 'File ID' })
  @ApiResponse({ status: 200, description: 'File details retrieved' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async getFileDetails(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.filesService.getFileDetails(id, user.userId);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download file by ID' })
  @ApiParam({ name: 'id', description: 'File ID' })
  @ApiResponse({ status: 200, description: 'File stream binary' })
  @ApiResponse({ status: 403, description: 'Download permission denied' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async download(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { file, stream } = await this.filesService.downloadFile(id, user.userId);

    res.set({
      'Content-Type': file.mimeType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(file.originalName)}"`,
      'Content-Length': file.size.toString(),
    });

    return new StreamableFile(stream as any);
  }

  @Get(':id/preview')
  @ApiOperation({ summary: 'Preview/stream file inline by ID' })
  @ApiParam({ name: 'id', description: 'File ID' })
  @ApiResponse({ status: 200, description: 'File stream inline' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async preview(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { file, stream } = await this.filesService.previewFile(id, user.userId);

    res.set({
      'Content-Type': file.mimeType || 'application/octet-stream',
      'Content-Disposition': `inline; filename="${encodeURIComponent(file.originalName)}"`,
      'Content-Length': file.size.toString(),
    });

    return new StreamableFile(stream as any);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete file by ID (owner only)' })
  @ApiParam({ name: 'id', description: 'File ID' })
  @ApiResponse({ status: 200, description: 'File deleted successfully' })
  @ApiResponse({ status: 403, description: 'Only owner can delete' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.filesService.deleteFile(id, user.userId);
  }

  @Patch(':id/visibility')
  @ApiOperation({ summary: 'Update file visibility (PRIVATE, SHARED, PUBLIC)' })
  @ApiParam({ name: 'id', description: 'File ID' })
  @ApiResponse({ status: 200, description: 'Visibility updated successfully' })
  @ApiResponse({ status: 403, description: 'Only owner can update visibility' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async updateVisibility(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateVisibilityDto,
  ) {
    return this.filesService.updateVisibility(id, user.userId, dto.visibility);
  }
}
