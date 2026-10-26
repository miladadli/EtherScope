import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('tokens')
export class TokenEntity {
  @PrimaryColumn({ type: 'varchar', length: 42 })
  address!: string;

  @Column({ type: 'varchar', length: 32 })
  symbol!: string;

  @Column({ type: 'smallint' })
  decimals!: number;

  @Column({ type: 'boolean', default: true })
  enabled!: boolean;
}
