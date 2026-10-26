import { Injectable, NotFoundException } from '@nestjs/common';
import { AddressesRepository } from './addresses.repository';

@Injectable()
export class AddressesService {
  constructor(private readonly addressesRepository: AddressesRepository) {}

  async getOrThrow(address: string) {
    const normalized = address.toLowerCase();
    const row = await this.addressesRepository.findByAddress(normalized);
    if (!row) {
      throw new NotFoundException(`Address ${normalized} is not watched`);
    }
    return row;
  }

  async getSync(address: string, indexerLastBlock: string, tip: string) {
    const row = await this.getOrThrow(address);
    return {
      address: row.address,
      watched: true,
      startBlock: row.startBlock,
      indexerLastBlock,
      tip,
    };
  }

  listWatched() {
    return this.addressesRepository.findAll();
  }
}
