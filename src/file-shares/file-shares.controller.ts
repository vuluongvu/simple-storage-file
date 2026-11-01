import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FileSharesService } from './file-shares.service.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy.js';
import { CreateFileShareDto } from './dto/create-file-share.dto.js';
import { UpdateFileShareDto } from './dto/update-file-share.dto.js';

@ApiTags('File Sharing')
@ApiBearerAuth('bearer')
@Controller('files')
export class FileSharesController {
  constructor(private readonly fileSharesService: FileSharesService) {}

  @Get('shared-with-me')
  @ApiOperation({ summary: 'Get list of files shared with current user' })
  @ApiResponse({ status: 200, description: 'List of shared files retrieved' })
  async getSharedWithMe(@CurrentUser() user: AuthenticatedUser) {
    return this.fileSharesService.getFilesSharedWithMe(user.userId);
  }

  @Get('shared-by-me')
  @ApiOperation({ summary: 'Get list of files current user has shared with others' })
  @ApiResponse({ status: 200, description: 'List of files shared by current user retrieved' })
  async getSharedByMe(@CurrentUser() user: AuthenticatedUser) {
    return this.fileSharesService.getFilesSharedByMe(user.userId);
  }

  @Post(':id/shares')
  @ApiOperation({ summary: 'Share a file with another user via email' })
  @ApiParam({ name: 'id', description: 'File ID' })
  @ApiResponse({ status: 201, description: 'File shared successfully' })
  @ApiResponse({ status: 400, description: 'Cannot share file with self' })
  @ApiResponse({ status: 403, description: 'Only owner can share file' })
  @ApiResponse({ status: 404, description: 'File or target user not found' })
  async shareFile(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateFileShareDto,
  ) {
    return this.fileSharesService.shareFile(id, user.userId, dto);
  }

  @Get(':id/shares')
  @ApiOperation({ summary: 'Get list of users a file is shared with' })
  @ApiParam({ name: 'id', description: 'File ID' })
  @ApiResponse({ status: 200, description: 'List of shares retrieved' })
  @ApiResponse({ status: 403, description: 'Only owner can view shares' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async getFileShares(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.fileSharesService.getFileShares(id, user.userId);
  }

  @Patch(':id/shares/:shareId')
  @ApiOperation({ summary: 'Update file share permission (VIEW / DOWNLOAD)' })
  @ApiParam({ name: 'id', description: 'File ID' })
  @ApiParam({ name: 'shareId', description: 'Share ID' })
  @ApiResponse({ status: 200, description: 'Share permission updated' })
  @ApiResponse({ status: 403, description: 'Only owner can modify share' })
  @ApiResponse({ status: 404, description: 'File or share not found' })
  async updateFileShare(
    @Param('id', ParseIntPipe) id: number,
    @Param('shareId', ParseIntPipe) shareId: number,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateFileShareDto,
  ) {
    return this.fileSharesService.updateFileShare(id, shareId, user.userId, dto);
  }

  @Delete(':id/shares/:shareId')
  @ApiOperation({ summary: 'Revoke file share access' })
  @ApiParam({ name: 'id', description: 'File ID' })
  @ApiParam({ name: 'shareId', description: 'Share ID' })
  @ApiResponse({ status: 200, description: 'Share revoked successfully' })
  @ApiResponse({ status: 403, description: 'Only owner can revoke share' })
  @ApiResponse({ status: 404, description: 'File or share not found' })
  async revokeFileShare(
    @Param('id', ParseIntPipe) id: number,
    @Param('shareId', ParseIntPipe) shareId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.fileSharesService.revokeFileShare(id, shareId, user.userId);
  }
}
