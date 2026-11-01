import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { FileVisibility } from '../../common/enums/file-visibility.enum.js';

export class UploadFileDto {
  @ApiPropertyOptional({
    enum: FileVisibility,
    default: FileVisibility.PRIVATE,
    description: 'Initial visibility mode for the uploaded file',
  })
  @IsOptional()
  @IsEnum(FileVisibility, { message: 'Visibility must be PRIVATE, SHARED, or PUBLIC' })
  visibility?: FileVisibility;
}
