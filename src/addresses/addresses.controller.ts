import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { AddressesService } from './addresses.service';
import { IndexerStateService } from '../indexer/indexer-state.service';
import { EthereumService } from '../ethereum/ethereum.service';
import { SyncResponseDto } from './dto/sync-response.dto';

@ApiTags('addresses')
@Controller('addresses')
export class AddressesController {
  constructor(
    private readonly addressesService: AddressesService,
    private readonly indexerStateService: IndexerStateService,
    private readonly ethereumService: EthereumService,
  ) {}

  @Get(':address/sync')
  @ApiOperation({
    summary: 'Watch status vs indexer checkpoint and chain tip',
  })
  @ApiParam({
    name: 'address',
    description: '0x-prefixed address (case-insensitive)',
    example: '0x1111111111111111111111111111111111111111',
  })
  @ApiOkResponse({ type: SyncResponseDto })
  @ApiNotFoundResponse({ description: 'Address is not watched' })
  async sync(@Param('address') address: string): Promise<SyncResponseDto> {
    const state = await this.indexerStateService.getState();
    const tip = await this.ethereumService.getBlockNumber();
    return this.addressesService.getSync(
      address,
      state?.lastBlockNumber ?? '0',
      tip.toString(),
    );
  }
}
