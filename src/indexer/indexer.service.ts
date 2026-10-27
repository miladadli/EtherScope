import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { parseTokenAddresses, type Env } from '../config/env.schema';
import { EthereumService } from '../ethereum/ethereum.service';
import { TokensService } from '../tokens/tokens.service';
import { IndexerLockService } from './indexer-lock.service';
import { IndexerStateService } from './indexer-state.service';
import { IndexedBlocksRepository } from './indexed-blocks.repository';
import { TransferExtractorService } from './transfer-extractor.service';
import { IndexerPersistService } from './indexer-persist.service';
import { ReorgService } from './reorg.service';
import { WatchSetService } from './watch-set.service';
import { MetricsService } from '../metrics/metrics.service';
import { withBackoff } from '../common/retry';

@Injectable()
export class IndexerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IndexerService.name);
  private running = false;
  private loopPromise: Promise<void> | null = null;
  private stopping = false;
  private failures = 0;

  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly ethereum: EthereumService,
    private readonly tokensService: TokensService,
    private readonly lock: IndexerLockService,
    private readonly stateService: IndexerStateService,
    private readonly indexedBlocks: IndexedBlocksRepository,
    private readonly extractor: TransferExtractorService,
    private readonly persist: IndexerPersistService,
    private readonly reorg: ReorgService,
    private readonly watchSet: WatchSetService,
    private readonly metrics: MetricsService,
  ) {}

  async onModuleInit() {
    const enabled =
      process.env.ENABLE_INDEXER !== 'false' &&
      this.config.get('ENABLE_INDEXER', { infer: true }) !== false;
    if (!enabled) {
      this.logger.log('indexer disabled (ENABLE_INDEXER=false)');
      return;
    }

    const acquired = await this.lock.tryAcquire();
    if (!acquired) {
      this.logger.error('indexer not started — lock unavailable');
      return;
    }

    this.running = true;
    this.stopping = false;
    this.loopPromise = this.runLoop();
    this.logger.log('indexer loop started');
  }

  async onModuleDestroy() {
    this.stopping = true;
    this.running = false;
    if (this.loopPromise) {
      await this.loopPromise;
    }
    await this.lock.release();
    this.logger.log('indexer stopped');
  }

  isRunning(): boolean {
    return this.running;
  }

  async processOnce(): Promise<void> {
    await this.tick();
  }

  private async runLoop(): Promise<void> {
    const pollMs = this.config.get('POLL_INTERVAL_MS', { infer: true });

    while (!this.stopping) {
      try {
        await this.tick();
        this.failures = 0;
      } catch (err) {
        this.failures += 1;
        this.metrics.inc('indexer_tick_errors_total');
        const backoff = Math.min(pollMs * 2 ** Math.min(this.failures, 5), 30_000);
        this.logger.error('indexer tick failed', {
          err: err instanceof Error ? err.message : err,
          failures: this.failures,
          backoffMs: backoff,
        });
        await this.sleep(backoff);
        continue;
      }
      await this.sleep(pollMs);
    }
  }

  private async tick(): Promise<void> {
    await this.watchSet.refreshIfChanged();

    const tip = await withBackoff(() => this.ethereum.getBlockNumber());
    const depth = BigInt(this.config.get('CONFIRMATION_DEPTH', { infer: true }));
    const safeTip = tip > depth ? tip - depth : 0n;

    let state = await this.stateService.getState();

    if (!state) {
      await this.bootstrapCheckpoint(safeTip);
      return;
    }

    let last = BigInt(state.lastBlockNumber);

    const chainAtLast = await this.ethereum
      .getClient()
      .getBlock({
        blockNumber: last,
      })
      .catch(() => null);

    if (
      tip < last ||
      !chainAtLast?.hash ||
      chainAtLast.hash.toLowerCase() !== state.lastBlockHash.toLowerCase()
    ) {
      const fork = await this.reorg.findForkParent(last);
      await this.reorg.rollbackTo(fork);
      this.metrics.inc('indexer_reorgs_total');
      state = await this.stateService.getState();
      if (!state) {
        return;
      }
      last = BigInt(state.lastBlockNumber);
    }

    if (last >= safeTip) {
      return;
    }

    const catchup = this.config.get('BATCH_SIZE_CATCHUP', { infer: true });
    const live = this.config.get('BATCH_SIZE_LIVE', { infer: true });
    const lag = safeTip - last;
    const batchSize = BigInt(lag > 5n ? catchup : live);

    const from = last + 1n;
    let to = from + batchSize - 1n;
    if (to > safeTip) {
      to = safeTip;
    }

    const first = await this.ethereum.getClient().getBlock({ blockNumber: from });
    if (last >= 0n) {
      const parentLocal = await this.indexedBlocks.findByNumber(last.toString());
      if (
        parentLocal &&
        first.parentHash.toLowerCase() !== parentLocal.blockHash.toLowerCase()
      ) {
        const fork = await this.reorg.findForkParent(last);
        await this.reorg.rollbackTo(fork);
        this.metrics.inc('indexer_reorgs_total');
        return;
      }
    }

    const tokens = await this.resolveTokenAddresses();
    const batch = await withBackoff(() => this.extractor.extractRange(from, to, tokens));
    await this.persist.commitBatch(batch);

    this.metrics.inc('indexer_batches_total');
    this.metrics.inc('indexer_transfers_total', batch.transfers.length);

    this.logger.log(
      `indexed ${from}-${to} (${batch.transfers.length} transfers, tip=${tip})`,
    );
  }

  private async bootstrapCheckpoint(safeTip: bigint): Promise<void> {
    const client = this.ethereum.getClient();
    const block = await client.getBlock({ blockNumber: safeTip });
    await this.persist.commitBatch({
      blocks: [
        {
          blockNumber: safeTip.toString(),
          blockHash: block.hash!,
          parentHash: block.parentHash,
        },
      ],
      transfers: [],
      touchedEth: [],
      touchedTokenPairs: [],
    });
    this.logger.log(`bootstrap checkpoint at ${safeTip}`);
  }

  private async resolveTokenAddresses(): Promise<`0x${string}`[]> {
    const fromDb = await this.tokensService.listEnabled();
    if (fromDb.length > 0) {
      return fromDb.map((t) => t.address as `0x${string}`);
    }
    return parseTokenAddresses(this.config.get('TOKEN_ADDRESSES', { infer: true }));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
