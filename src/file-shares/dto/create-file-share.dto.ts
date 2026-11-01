import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty } from 'class-validator';
import { SharePermission } from '../../common/enums/share-permission.enum.js';

export class CreateFileShareDto {
  @ApiProperty({
    example: 'colleague@example.com',
    description: 'Email of the user to share the file with',
  })
  @IsEmail({}, { message: 'Invalid email address format' })
  @IsNotEmpty({ message: 'Target email is required' })
  email: string;

  @ApiProperty({
    enum: SharePermission,
    example: SharePermission.VIEW,
    description: 'Permission granted (VIEW or DOWNLOAD)',
  })
  @IsEnum(SharePermission, { message: 'Permission must be either VIEW or DOWNLOAD' })
  @IsNotEmpty({ message: 'Permission is required' })
  permission: SharePermission;
}
