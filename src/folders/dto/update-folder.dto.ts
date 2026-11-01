import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateFolderDto {
  @ApiProperty({ description: 'New folder name', example: 'Work Documents' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;
}
