import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity('indexed_blocks')
export class IndexedBlockEntity {
  @PrimaryColumn({ name: 'block_number', type: 'bigint' })
  blockNumber!: string;

  @Column({ name: 'block_hash', type: 'varchar', length: 66 })
  blockHash!: string;

  @Column({ name: 'parent_hash', type: 'varchar', length: 66 })
  parentHash!: string;

  @CreateDateColumn({ name: 'indexed_at', type: 'timestamptz' })
  indexedAt!: Date;
}
