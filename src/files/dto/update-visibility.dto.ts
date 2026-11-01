import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { FileVisibility } from '../../common/enums/file-visibility.enum.js';

export class UpdateVisibilityDto {
  @ApiProperty({
    enum: FileVisibility,
    example: FileVisibility.SHARED,
    description: 'New visibility mode for the file',
  })
  @IsEnum(FileVisibility, { message: 'Visibility must be PRIVATE, SHARED, or PUBLIC' })
  @IsNotEmpty({ message: 'Visibility is required' })
  visibility: FileVisibility;
}
