import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import type { Env } from '../config/env.schema';
import { TransfersRepository } from '../transfers/transfers.repository';
import { BalancesRepository } from '../balances/balances.repository';
import { IndexedBlocksRepository } from './indexed-blocks.repository';
import { IndexerStateService } from './indexer-state.service';
import type { ExtractedBatch } from './transfer-extractor.service';

@Injectable()
export class IndexerPersistService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly transfersRepository: TransfersRepository,
    private readonly balancesRepository: BalancesRepository,
    private readonly indexedBlocksRepository: IndexedBlocksRepository,
    private readonly indexerStateService: IndexerStateService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async commitBatch(batch: ExtractedBatch): Promise<void> {
    if (batch.blocks.length === 0) {
      return;
    }

    const last = batch.blocks[batch.blocks.length - 1];
    const depth = this.config.get('CONFIRMATION_DEPTH', { infer: true });
    const pruneBefore = BigInt(last.blockNumber) - BigInt(depth) * 10n;

    await this.dataSource.transaction(async (manager) => {
      await this.transfersRepository.upsertActive(manager, batch.transfers);
      await this.balancesRepository.markDirtyEth(manager, batch.touchedEth);
      await this.balancesRepository.markDirty(manager, batch.touchedTokenPairs);
      await this.indexedBlocksRepository.insertMany(manager, batch.blocks);
      if (pruneBefore > 0n) {
        await this.indexedBlocksRepository.pruneBefore(manager, pruneBefore.toString());
      }
      await this.indexerStateService.saveState(manager, last.blockNumber, last.blockHash);
    });
  }
}
