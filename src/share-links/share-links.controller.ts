import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ShareLinksService } from './share-links.service.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy.js';
import { CreateShareLinkDto } from './dto/create-share-link.dto.js';

@ApiTags('Share Links')
@ApiBearerAuth('bearer')
@Controller('files/:id/share-links')
export class ShareLinksController {
  constructor(private readonly shareLinksService: ShareLinksService) {}

  @Post()
  @ApiOperation({ summary: 'Generate public share link for a file' })
  @ApiParam({ name: 'id', description: 'File ID' })
  @ApiResponse({ status: 201, description: 'Share link created successfully' })
  @ApiResponse({ status: 403, description: 'Only owner can create share link' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async createShareLink(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateShareLinkDto,
  ) {
    return this.shareLinksService.createShareLink(id, user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all public share links for a file' })
  @ApiParam({ name: 'id', description: 'File ID' })
  @ApiResponse({ status: 200, description: 'List of share links' })
  @ApiResponse({ status: 403, description: 'Only owner can view share links' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async getShareLinks(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.shareLinksService.getFileShareLinks(id, user.userId);
  }

  @Delete(':linkId')
  @ApiOperation({ summary: 'Revoke or disable a public share link' })
  @ApiParam({ name: 'id', description: 'File ID' })
  @ApiParam({ name: 'linkId', description: 'Share Link ID' })
  @ApiResponse({ status: 200, description: 'Share link revoked successfully' })
  @ApiResponse({ status: 403, description: 'Only owner can revoke share link' })
  @ApiResponse({ status: 404, description: 'File or link not found' })
  async revokeShareLink(
    @Param('id', ParseIntPipe) id: number,
    @Param('linkId', ParseIntPipe) linkId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.shareLinksService.revokeShareLink(id, linkId, user.userId);
  }
}
