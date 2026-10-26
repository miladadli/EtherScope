import { Module } from '@nestjs/common';
import { AddressesController } from './addresses.controller';
import { AddressesCoreModule } from './addresses-core.module';
import { IndexerStateModule } from '../indexer/indexer-state.module';
import { EthereumModule } from '../ethereum/ethereum.module';

@Module({
  imports: [AddressesCoreModule, IndexerStateModule, EthereumModule],
  controllers: [AddressesController],
  exports: [AddressesCoreModule],
})
export class AddressesModule {}
