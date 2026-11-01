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
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FoldersService } from './folders.service.js';
import { CreateFolderDto } from './dto/create-folder.dto.js';
import { UpdateFolderDto } from './dto/update-folder.dto.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy.js';

@ApiTags('Folders')
@ApiBearerAuth('bearer')
@Controller('folders')
export class FoldersController {
  constructor(private readonly foldersService: FoldersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new folder' })
  @ApiResponse({ status: 201, description: 'Folder created successfully' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateFolderDto,
  ) {
    return this.foldersService.create(user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get folders for current user' })
  @ApiQuery({ name: 'parentId', required: false, type: Number, description: 'Parent folder ID filter (null for root)' })
  @ApiResponse({ status: 200, description: 'List of folders' })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('parentId') parentId?: string,
  ) {
    const parsedParentId =
      parentId === undefined
        ? undefined
        : parentId === 'null' || parentId === ''
          ? null
          : parseInt(parentId, 10);
    return this.foldersService.findAll(user.userId, parsedParentId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get folder details with breadcrumbs' })
  @ApiParam({ name: 'id', description: 'Folder ID' })
  @ApiResponse({ status: 200, description: 'Folder details' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.foldersService.findOne(user.userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Rename folder' })
  @ApiParam({ name: 'id', description: 'Folder ID' })
  @ApiResponse({ status: 200, description: 'Folder updated successfully' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFolderDto,
  ) {
    return this.foldersService.update(user.userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete folder and its contents' })
  @ApiParam({ name: 'id', description: 'Folder ID' })
  @ApiResponse({ status: 200, description: 'Folder deleted successfully' })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.foldersService.remove(user.userId, id);
  }
}
