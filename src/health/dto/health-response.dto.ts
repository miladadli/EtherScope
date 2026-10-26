import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({ enum: ['ok', 'degraded'] })
  status!: 'ok' | 'degraded';

  @ApiProperty()
  db!: boolean;

  @ApiProperty()
  rpc!: boolean;

  @ApiProperty()
  indexerRunning!: boolean;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Chain tip as decimal string, or null if RPC is down',
    example: '42',
  })
  tip!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Last committed indexer checkpoint block',
    example: '30',
  })
  lastIndexedBlock!: string | null;
}
