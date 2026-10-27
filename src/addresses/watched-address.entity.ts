import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity('watched_addresses')
export class WatchedAddressEntity {
  @PrimaryColumn({ type: 'varchar', length: 42 })
  address!: string;

  @Column({ name: 'start_block', type: 'bigint' })
  startBlock!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
