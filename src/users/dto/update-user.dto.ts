import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'John Doe Updated', description: 'Updated full name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fullName?: string;
}
