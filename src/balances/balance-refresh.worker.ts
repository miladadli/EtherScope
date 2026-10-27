import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.schema';
import { EthereumService } from '../ethereum/ethereum.service';
import { BalancesService } from './balances.service';
import { MetricsService } from '../metrics/metrics.service';

@Injectable()
export class BalanceRefreshWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BalanceRefreshWorker.name);
  private stopping = false;
  private loopPromise: Promise<void> | null = null;

  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly ethereum: EthereumService,
    private readonly balancesService: BalancesService,
    private readonly metrics: MetricsService,
  ) {}

  async onModuleInit() {
    const enabled = this.config.get('ENABLE_BALANCE_WORKER', { infer: true });
    if (!enabled) {
      this.logger.log('balance refresh worker disabled');
      return;
    }
    this.stopping = false;
    this.loopPromise = this.runLoop();
    this.logger.log('balance refresh worker started');
  }

  async onModuleDestroy() {
    this.stopping = true;
    if (this.loopPromise) {
      await this.loopPromise;
    }
    this.logger.log('balance refresh worker stopped');
  }

  private async runLoop(): Promise<void> {
    const interval = this.config.get('BALANCE_REFRESH_INTERVAL_MS', {
      infer: true,
    });

    while (!this.stopping) {
      try {
        const tip = await this.ethereum.getBlockNumber();
        const depth = BigInt(this.config.get('CONFIRMATION_DEPTH', { infer: true }));
        const safeTip = tip > depth ? tip - depth : 0n;
        const refreshed = await this.balancesService.refreshDirtyBatch(safeTip);
        if (refreshed > 0) {
          this.metrics.inc('balance_refresh_pairs_total', refreshed);
          this.logger.debug(`refreshed ${refreshed} dirty balances at ${safeTip}`);
        }
      } catch (err) {
        this.metrics.inc('balance_refresh_errors_total');
        this.logger.error('balance refresh tick failed', {
          err: err instanceof Error ? err.message : err,
        });
      }
      await this.sleep(interval);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
