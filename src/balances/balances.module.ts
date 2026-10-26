import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BalanceEntity } from './balance.entity';
import { BalancesRepository } from './balances.repository';
import { BalancesService } from './balances.service';
import { BalancesController } from './balances.controller';
import { AddressesCoreModule } from '../addresses/addresses-core.module';
import { EthereumModule } from '../ethereum/ethereum.module';
import { TokensModule } from '../tokens/tokens.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BalanceEntity]),
    AddressesCoreModule,
    EthereumModule,
    TokensModule,
  ],
  controllers: [BalancesController],
  providers: [BalancesRepository, BalancesService],
  exports: [BalancesRepository, BalancesService],
})
export class BalancesModule {}
