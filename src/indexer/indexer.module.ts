import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IndexedBlockEntity } from './indexed-block.entity';
import { IndexerStateModule } from './indexer-state.module';
import { WatchSetService } from './watch-set.service';
import { ReorgService } from './reorg.service';
import { IndexerService } from './indexer.service';
import { IndexerLockService } from './indexer-lock.service';
import { IndexedBlocksRepository } from './indexed-blocks.repository';
import { TransferExtractorService } from './transfer-extractor.service';
import { IndexerPersistService } from './indexer-persist.service';
import { AddressesCoreModule } from '../addresses/addresses-core.module';
import { TransfersModule } from '../transfers/transfers.module';
import { BalancesModule } from '../balances/balances.module';
import { TokensModule } from '../tokens/tokens.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([IndexedBlockEntity]),
    IndexerStateModule,
    AddressesCoreModule,
    TransfersModule,
    BalancesModule,
    TokensModule,
  ],
  providers: [
    WatchSetService,
    ReorgService,
    IndexerLockService,
    IndexedBlocksRepository,
    TransferExtractorService,
    IndexerPersistService,
    IndexerService,
  ],
  exports: [
    IndexerStateModule,
    WatchSetService,
    ReorgService,
    IndexerService,
  ],
})
export class IndexerModule {}
