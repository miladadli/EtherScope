import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class IndexerStatusDto {
  @ApiProperty({ description: 'Whether the in-process indexer loop holds the lock' })
  running!: boolean;

  @ApiProperty({ description: 'In-memory WatchSet size' })
  watchedAddresses!: number;

  @ApiPropertyOptional({ nullable: true, example: '30' })
  lastBlockNumber!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    example: '0xabc…',
  })
  lastBlockHash!: string | null;

  @ApiProperty({ description: 'Current chain tip', example: '42' })
  tip!: string;
}
