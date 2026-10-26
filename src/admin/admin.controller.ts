import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IndexerService } from '../indexer/indexer.service';
import { IndexerStateService } from '../indexer/indexer-state.service';
import { WatchSetService } from '../indexer/watch-set.service';
import { EthereumService } from '../ethereum/ethereum.service';
import { IndexerStatusDto } from './dto/indexer-status.dto';

@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly indexerService: IndexerService,
    private readonly indexerStateService: IndexerStateService,
    private readonly watchSetService: WatchSetService,
    private readonly ethereumService: EthereumService,
  ) {}

  @Get('indexer')
  @ApiOperation({ summary: 'Indexer lock/loop status and checkpoint' })
  @ApiOkResponse({ type: IndexerStatusDto })
  async status(): Promise<IndexerStatusDto> {
    const state = await this.indexerStateService.getState();
    const tip = await this.ethereumService.getBlockNumber();
    return {
      running: this.indexerService.isRunning(),
      watchedAddresses: this.watchSetService.size(),
      lastBlockNumber: state?.lastBlockNumber ?? null,
      lastBlockHash: state?.lastBlockHash ?? null,
      tip: tip.toString(),
    };
  }
}
