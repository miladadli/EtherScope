import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BalanceEntity } from './balance.entity';
import { BalancesRepository } from './balances.repository';
import { BalancesService } from './balances.service';
import { BalancesController } from './balances.controller';
import { BalanceRefreshWorker } from './balance-refresh.worker';
import { AddressesCoreModule } from '../addresses/addresses-core.module';
import { EthereumModule } from '../ethereum/ethereum.module';
import { TokensModule } from '../tokens/tokens.module';
import { MetricsCoreModule } from '../metrics/metrics-core.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BalanceEntity]),
    AddressesCoreModule,
    EthereumModule,
    TokensModule,
    MetricsCoreModule,
  ],
  controllers: [BalancesController],
  providers: [BalancesRepository, BalancesService, BalanceRefreshWorker],
  exports: [BalancesRepository, BalancesService],
})
export class BalancesModule {}
