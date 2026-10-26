import { Global, Module } from '@nestjs/common';
import { EthereumService } from './ethereum.service';
import { MulticallService } from './multicall.service';

@Global()
@Module({
  providers: [EthereumService, MulticallService],
  exports: [EthereumService, MulticallService],
})
export class EthereumModule {}
