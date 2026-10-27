import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { EthereumModule } from './ethereum/ethereum.module';
import { AddressesModule } from './addresses/addresses.module';
import { TokensModule } from './tokens/tokens.module';
import { TransfersModule } from './transfers/transfers.module';
import { BalancesModule } from './balances/balances.module';
import { IndexerModule } from './indexer/indexer.module';
import { HealthModule } from './health/health.module';
import { AdminModule } from './admin/admin.module';
import { SeederModule } from './seeder/seeder.module';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    EthereumModule,
    AddressesModule,
    TokensModule,
    TransfersModule,
    BalancesModule,
    IndexerModule,
    HealthModule,
    AdminModule,
    SeederModule,
  ],
})
export class AppModule {}
