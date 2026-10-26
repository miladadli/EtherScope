import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BalanceEntryDto {
  @ApiProperty({
    description: '"ETH" or lowercase ERC-20 contract address',
    example: 'ETH',
  })
  token!: string;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Null while dirty/unavailable',
    example: '1000000000000000000',
  })
  balance!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Block at which balance was read',
    example: '30',
  })
  balanceBlock!: string | null;

  @ApiProperty()
  dirty!: boolean;
}

export class BalancesResponseDto {
  @ApiProperty({ example: '0x1111111111111111111111111111111111111111' })
  address!: string;

  @ApiProperty({ description: 'Current chain tip', example: '42' })
  latestBlock!: string;

  @ApiProperty({
    description: 'tip − CONFIRMATION_DEPTH used for Multicall reads',
    example: '30',
  })
  safeTip!: string;

  @ApiProperty({ type: [BalanceEntryDto] })
  balances!: BalanceEntryDto[];
}
