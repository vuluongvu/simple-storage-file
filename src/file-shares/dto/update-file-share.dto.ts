import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { SharePermission } from '../../common/enums/share-permission.enum.js';

export class UpdateFileShareDto {
  @ApiProperty({
    enum: SharePermission,
    example: SharePermission.DOWNLOAD,
    description: 'Updated permission (VIEW or DOWNLOAD)',
  })
  @IsEnum(SharePermission, { message: 'Permission must be either VIEW or DOWNLOAD' })
  @IsNotEmpty({ message: 'Permission is required' })
  permission: SharePermission;
}
