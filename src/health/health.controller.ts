import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { EthereumService } from '../ethereum/ethereum.service';
import { IndexerService } from '../indexer/indexer.service';
import { IndexerStateService } from '../indexer/indexer-state.service';
import { HealthResponseDto } from './dto/health-response.dto';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly dataSource: DataSource,
    private readonly ethereumService: EthereumService,
    private readonly indexerService: IndexerService,
    private readonly indexerStateService: IndexerStateService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'DB + RPC liveness and indexer lag snapshot' })
  @ApiOkResponse({ type: HealthResponseDto })
  async check(): Promise<HealthResponseDto> {
    let dbOk = false;
    try {
      await this.dataSource.query('SELECT 1');
      dbOk = true;
    } catch {
      dbOk = false;
    }

    const rpcOk = await this.ethereumService.isReachable();
    const tip = rpcOk ? (await this.ethereumService.getBlockNumber()).toString() : null;
    const state = await this.indexerStateService.getState();

    return {
      status: dbOk && rpcOk ? 'ok' : 'degraded',
      db: dbOk,
      rpc: rpcOk,
      indexerRunning: this.indexerService.isRunning(),
      tip,
      lastIndexedBlock: state?.lastBlockNumber ?? null,
    };
  }
}
