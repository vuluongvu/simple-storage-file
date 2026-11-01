import {
  Body,
  Controller,
  Get,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { SearchUserDto } from './dto/search-user.dto.js';

@ApiTags('Users')
@ApiBearerAuth('bearer')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  async getProfile(@CurrentUser() authUser: AuthenticatedUser) {
    return this.usersService.findById(authUser.userId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user basic profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  async updateProfile(
    @CurrentUser() authUser: AuthenticatedUser,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(authUser.userId, dto);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search users by email for file sharing' })
  @ApiQuery({ name: 'email', required: true, description: 'Email address substring' })
  @ApiResponse({ status: 200, description: 'List of matching users' })
  async searchByEmail(@Query() query: SearchUserDto) {
    return this.usersService.searchByEmail(query.email);
  }
}
