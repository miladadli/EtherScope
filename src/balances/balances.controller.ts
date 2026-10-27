import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { BalancesService } from './balances.service';
import { BalancesResponseDto } from './dto/balances-response.dto';

@ApiTags('addresses')
@Controller('addresses')
export class BalancesController {
  constructor(private readonly balancesService: BalancesService) {}

  @Get(':address/balances')
  @ApiOperation({
    summary:
      'ETH + enabled ERC-20 balances (cache-first; dirty rows filled by background worker)',
  })
  @ApiParam({
    name: 'address',
    description: '0x-prefixed address (case-insensitive)',
    example: '0x1111111111111111111111111111111111111111',
  })
  @ApiOkResponse({ type: BalancesResponseDto })
  @ApiNotFoundResponse({ description: 'Address is not watched' })
  get(@Param('address') address: string): Promise<BalancesResponseDto> {
    return this.balancesService.getBalances(address);
  }
}
