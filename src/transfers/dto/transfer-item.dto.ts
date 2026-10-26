import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TransferItemDto {
  @ApiProperty({ example: '0xdead…' })
  txHash!: string;

  @ApiProperty({
    description: 'Log index; -1 for native ETH transfers',
    example: -1,
  })
  logIndex!: number;

  @ApiProperty({ example: '20' })
  blockNumber!: string;

  @ApiProperty({ example: '0xabc…' })
  blockHash!: string;

  @ApiProperty({ example: '0xfrom…' })
  from!: string;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Null for burns / zero-address edge cases',
    example: '0xto…',
  })
  to!: string | null;

  @ApiProperty({ enum: ['ETH', 'ERC20'], example: 'ETH' })
  asset!: string;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Null for native ETH; token contract for ERC-20',
    example: null,
  })
  tokenAddress!: string | null;

  @ApiProperty({
    description: 'Amount as decimal string (wei / token base units)',
    example: '1000000000000000000',
  })
  value!: string;

  @ApiProperty({ enum: ['active', 'reorged'] })
  status!: string;
}
