import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateFolderDto {
  @ApiProperty({ description: 'Folder name', example: 'Documents' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'Parent folder ID', example: 1 })
  @IsOptional()
  @IsNumber()
  parentId?: number;
}
