import { Injectable } from '@nestjs/common';

@Injectable()
export class MetricsService {
  private readonly counters = {
    indexer_batches_total: 0,
    indexer_transfers_total: 0,
    indexer_reorgs_total: 0,
    indexer_tick_errors_total: 0,
    balance_refresh_pairs_total: 0,
    balance_refresh_errors_total: 0,
  };

  inc(name: keyof MetricsService['counters'], by = 1): void {
    this.counters[name] += by;
  }

  snapshot(): Record<string, number> {
    return { ...this.counters };
  }
}
