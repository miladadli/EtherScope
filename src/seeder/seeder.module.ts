import { Module } from '@nestjs/common';
import { SeederService } from './seeder.service';
import { SeedCommand } from './seed.command';
import { AddressesCoreModule } from '../addresses/addresses-core.module';
import { TokensModule } from '../tokens/tokens.module';
import { EthereumModule } from '../ethereum/ethereum.module';
import { BalancesModule } from '../balances/balances.module';

@Module({
  imports: [
    AddressesCoreModule,
    TokensModule,
    EthereumModule,
    BalancesModule,
  ],
  providers: [SeederService, SeedCommand],
  exports: [SeederService],
})
export class SeederModule {}
