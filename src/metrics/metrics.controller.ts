import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { MetricsService } from './metrics.service';
import { IndexerService } from '../indexer/indexer.service';
import { IndexerStateService } from '../indexer/indexer-state.service';
import { EthereumService } from '../ethereum/ethereum.service';
import { BalancesRepository } from '../balances/balances.repository';
import { WatchSetService } from '../indexer/watch-set.service';
import type { Env } from '../config/env.schema';

@ApiTags('metrics')
@Controller('metrics')
export class MetricsController {
  constructor(
    private readonly metrics: MetricsService,
    private readonly config: ConfigService<Env, true>,
    private readonly indexer: IndexerService,
    private readonly indexerState: IndexerStateService,
    private readonly ethereum: EthereumService,
    private readonly balancesRepository: BalancesRepository,
    private readonly watchSet: WatchSetService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Process counters, lag, dirty queue, and role flags',
  })
  @ApiOkResponse({ description: 'JSON metrics snapshot' })
  async get() {
    const tip = await this.ethereum.getBlockNumber().catch(() => null);
    const state = await this.indexerState.getState();
    const last = state ? BigInt(state.lastBlockNumber) : null;
    const lag =
      tip !== null && last !== null ? (tip > last ? tip - last : 0n).toString() : null;

    return {
      role: {
        indexerEnabled: this.config.get('ENABLE_INDEXER', { infer: true }),
        balanceWorkerEnabled: this.config.get('ENABLE_BALANCE_WORKER', {
          infer: true,
        }),
        indexerRunning: this.indexer.isRunning(),
      },
      gauges: {
        chain_tip: tip?.toString() ?? null,
        last_indexed_block: state?.lastBlockNumber ?? null,
        indexer_lag_blocks: lag,
        watch_set_size: this.watchSet.size(),
        dirty_balances: await this.balancesRepository.countDirty(),
      },
      counters: this.metrics.snapshot(),
    };
  }
}
