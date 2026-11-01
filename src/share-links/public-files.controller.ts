import {
  Controller,
  Get,
  Param,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ShareLinksService } from './share-links.service.js';
import { Public } from '../auth/decorators/public.decorator.js';

@ApiTags('Public Files')
@Controller('public/files')
export class PublicFilesController {
  constructor(private readonly shareLinksService: ShareLinksService) {}

  @Public()
  @Get(':token')
  @ApiOperation({ summary: 'Get file information via public share token (no login required)' })
  @ApiParam({ name: 'token', description: 'Public share token' })
  @ApiResponse({ status: 200, description: 'File metadata retrieved' })
  @ApiResponse({ status: 404, description: 'Link invalid, expired, or revoked' })
  async getPublicFileInfo(@Param('token') token: string) {
    return this.shareLinksService.getPublicFileInfo(token);
  }

  @Public()
  @Get(':token/download')
  @ApiOperation({ summary: 'Download file via public share token (no login required)' })
  @ApiParam({ name: 'token', description: 'Public share token' })
  @ApiResponse({ status: 200, description: 'File binary stream' })
  @ApiResponse({ status: 404, description: 'Link invalid, expired, or revoked' })
  async downloadPublicFile(
    @Param('token') token: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { file, stream } = await this.shareLinksService.downloadPublicFile(token);

    res.set({
      'Content-Type': file.mimeType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(file.originalName)}"`,
      'Content-Length': file.size.toString(),
    });

    return new StreamableFile(stream as any);
  }

  @Public()
  @Get(':token/preview')
  @ApiOperation({ summary: 'Preview file inline via public share token (no login required)' })
  @ApiParam({ name: 'token', description: 'Public share token' })
  @ApiResponse({ status: 200, description: 'File binary stream inline' })
  @ApiResponse({ status: 404, description: 'Link invalid, expired, or revoked' })
  async previewPublicFile(
    @Param('token') token: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { file, stream } = await this.shareLinksService.downloadPublicFile(token);

    res.set({
      'Content-Type': file.mimeType || 'application/octet-stream',
      'Content-Disposition': `inline; filename="${encodeURIComponent(file.originalName)}"`,
      'Content-Length': file.size.toString(),
    });

    return new StreamableFile(stream as any);
  }
}
