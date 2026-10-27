import { Injectable } from '@nestjs/common';
import { AddressesService } from '../addresses/addresses.service';
import { TransfersRepository } from './transfers.repository';

@Injectable()
export class TransfersService {
  constructor(
    private readonly transfersRepository: TransfersRepository,
    private readonly addressesService: AddressesService,
  ) {}

  async listForAddress(
    address: string,
    query: {
      includeReorged?: boolean;
      limit?: number;
      cursorBlock?: string;
      cursorLogIndex?: number;
    },
  ) {
    const watched = await this.addressesService.getOrThrow(address);
    const rows = await this.transfersRepository.findForAddress(watched.address, {
      includeReorged: query.includeReorged === true,
      limit: Math.min(query.limit ?? 50, 200),
      minBlock: watched.startBlock,
      cursorBlock: query.cursorBlock,
      cursorLogIndex: query.cursorLogIndex,
    });

    return rows.map((t) => ({
      txHash: t.txHash,
      logIndex: t.logIndex,
      blockNumber: t.blockNumber,
      blockHash: t.blockHash,
      from: t.fromAddress,
      to: t.toAddress,
      asset: t.asset,
      tokenAddress: t.tokenAddress,
      value: t.value,
      status: t.status,
    }));
  }
}
