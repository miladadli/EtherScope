import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

export enum TransferAsset {
  Eth = 'eth',
  Erc20 = 'erc20',
}

export enum TransferStatus {
  Active = 'active',
  Reorged = 'reorged',
}

@Entity('transfers')
@Unique('uq_transfers_tx_log_hash', ['txHash', 'logIndex', 'blockHash'])
@Index('idx_transfers_from_block', ['fromAddress', 'blockNumber'])
@Index('idx_transfers_to_block', ['toAddress', 'blockNumber'])
@Index('idx_transfers_status_block', ['status', 'blockNumber'])
export class TransferEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'tx_hash', type: 'varchar', length: 66 })
  txHash!: string;

  @Column({ name: 'log_index', type: 'int' })
  logIndex!: number;

  @Column({ name: 'block_number', type: 'bigint' })
  blockNumber!: string;

  @Column({ name: 'block_hash', type: 'varchar', length: 66 })
  blockHash!: string;

  @Column({ name: 'from_address', type: 'varchar', length: 42 })
  fromAddress!: string;

  @Column({ name: 'to_address', type: 'varchar', length: 42, nullable: true })
  toAddress!: string | null;

  @Column({ type: 'enum', enum: TransferAsset })
  asset!: TransferAsset;

  @Column({ name: 'token_address', type: 'varchar', length: 42, nullable: true })
  tokenAddress!: string | null;

  @Column({ type: 'numeric', precision: 78, scale: 0 })
  value!: string;

  @Column({ type: 'enum', enum: TransferStatus, default: TransferStatus.Active })
  status!: TransferStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
