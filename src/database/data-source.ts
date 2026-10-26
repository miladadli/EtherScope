import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config as loadEnv } from 'dotenv';
import { WatchedAddressEntity } from '../addresses/watched-address.entity';
import { TokenEntity } from '../tokens/token.entity';
import { TransferEntity } from '../transfers/transfer.entity';
import { BalanceEntity } from '../balances/balance.entity';
import { IndexerStateEntity } from '../indexer/indexer-state.entity';
import { IndexedBlockEntity } from '../indexer/indexed-block.entity';

loadEnv();

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [
    WatchedAddressEntity,
    TokenEntity,
    TransferEntity,
    BalanceEntity,
    IndexerStateEntity,
    IndexedBlockEntity,
  ],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
  logging: false,
});
