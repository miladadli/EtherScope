import { Module } from '@nestjs/common';
import { MetricsController } from './metrics.controller';
import { MetricsCoreModule } from './metrics-core.module';
import { IndexerModule } from '../indexer/indexer.module';
import { BalancesModule } from '../balances/balances.module';
import { EthereumModule } from '../ethereum/ethereum.module';

@Module({
  imports: [MetricsCoreModule, IndexerModule, BalancesModule, EthereumModule],
  controllers: [MetricsController],
})
export class MetricsModule {}
