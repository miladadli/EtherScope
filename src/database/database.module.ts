import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WatchedAddressEntity } from '../addresses/watched-address.entity';
import { TokenEntity } from '../tokens/token.entity';
import { TransferEntity } from '../transfers/transfer.entity';
import { BalanceEntity } from '../balances/balance.entity';
import { IndexerStateEntity } from '../indexer/indexer-state.entity';
import { IndexedBlockEntity } from '../indexer/indexed-block.entity';
import type { Env } from '../config/env.schema';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        type: 'postgres' as const,
        url: config.get('DATABASE_URL', { infer: true }),
        entities: [
          WatchedAddressEntity,
          TokenEntity,
          TransferEntity,
          BalanceEntity,
          IndexerStateEntity,
          IndexedBlockEntity,
        ],
        synchronize: false,
        autoLoadEntities: false,
        extra: {
          max: config.get('DB_POOL_MAX', { infer: true }),
          options: `-c statement_timeout=${config.get('STATEMENT_TIMEOUT_MS', { infer: true })}`,
        },
      }),
    }),
  ],
})
export class DatabaseModule {}
