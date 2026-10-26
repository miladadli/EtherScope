import {
  Column,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

/** Sentinel for native ETH rows in balances.token_address */
export const ETH_TOKEN_SENTINEL = '0x0000000000000000000000000000000000000000';

@Entity('balances')
export class BalanceEntity {
  @PrimaryColumn({ type: 'varchar', length: 42 })
  address!: string;

  @PrimaryColumn({ name: 'token_address', type: 'varchar', length: 42 })
  tokenAddress!: string;

  @Column({ type: 'numeric', precision: 78, scale: 0 })
  balance!: string;

  @Column({ name: 'balance_block', type: 'bigint' })
  balanceBlock!: string;

  @Column({ type: 'boolean', default: false })
  dirty!: boolean;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
