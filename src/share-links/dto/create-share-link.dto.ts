import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, Min } from 'class-validator';

export class CreateShareLinkDto {
  @ApiPropertyOptional({
    example: 24,
    description: 'Number of hours until the public share link expires',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  expiresInHours?: number;

  @ApiPropertyOptional({
    example: '2026-12-31T23:59:59.000Z',
    description: 'Exact expiration timestamp (ISO string)',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
