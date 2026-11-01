import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SearchUserDto {
  @ApiProperty({ example: 'user@example.com', description: 'Email query to search for' })
  @IsString()
  @IsNotEmpty({ message: 'Email search query must not be empty' })
  email: string;
}
