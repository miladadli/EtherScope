import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { TransfersService } from './transfers.service';
import { ListTransfersQueryDto } from './dto/list-transfers.query.dto';
import { TransferItemDto } from './dto/transfer-item.dto';

@ApiTags('addresses')
@Controller('addresses')
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  @Get(':address/transfers')
  @ApiOperation({
    summary: 'Indexed transfers for a watched address (from start_block)',
  })
  @ApiParam({
    name: 'address',
    description: '0x-prefixed address (case-insensitive)',
    example: '0x1111111111111111111111111111111111111111',
  })
  @ApiOkResponse({ type: [TransferItemDto] })
  @ApiNotFoundResponse({ description: 'Address is not watched' })
  list(
    @Param('address') address: string,
    @Query() query: ListTransfersQueryDto,
  ): Promise<TransferItemDto[]> {
    return this.transfersService.listForAddress(address, {
      includeReorged: query.includeReorged === true,
      limit: query.limit,
      cursorBlock: query.cursorBlock,
      cursorLogIndex: query.cursorLogIndex,
    });
  }
}
