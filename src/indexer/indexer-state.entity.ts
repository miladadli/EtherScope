import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('indexer_state')
export class IndexerStateEntity {
  @PrimaryColumn({ type: 'int' })
  id!: number;

  @Column({ name: 'last_block_number', type: 'bigint' })
  lastBlockNumber!: string;

  @Column({ name: 'last_block_hash', type: 'varchar', length: 66 })
  lastBlockHash!: string;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
