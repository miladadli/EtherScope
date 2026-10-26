import { ApiProperty } from '@nestjs/swagger';

export class SyncResponseDto {
  @ApiProperty({ example: '0x1111111111111111111111111111111111111111' })
  address!: string;

  @ApiProperty({ example: true })
  watched!: boolean;

  @ApiProperty({
    description: 'First block included for this address (tip+1 at watch time)',
    example: '10',
  })
  startBlock!: string;

  @ApiProperty({
    description: 'Indexer checkpoint last_block_number',
    example: '30',
  })
  indexerLastBlock!: string;

  @ApiProperty({ description: 'Current chain tip', example: '42' })
  tip!: string;
}
