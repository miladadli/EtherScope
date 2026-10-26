import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListTransfersQueryDto {
  @ApiPropertyOptional({
    description: 'Include soft-reorged rows (default: active only)',
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  includeReorged?: boolean;

  @ApiPropertyOptional({
    description: 'Page size (capped at 200)',
    default: 50,
    minimum: 1,
    maximum: 200,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Cursor: block number of the last item from the previous page',
    example: '25',
  })
  @IsOptional()
  @IsString()
  cursorBlock?: string;

  @ApiPropertyOptional({
    description: 'Cursor: log index of the last item (-1 for native ETH)',
    example: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  cursorLogIndex?: number;
}
