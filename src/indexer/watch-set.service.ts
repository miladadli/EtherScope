import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AddressesRepository } from '../addresses/addresses.repository';

@Injectable()
export class WatchSetService implements OnModuleInit {
  private readonly logger = new Logger(WatchSetService.name);
  private readonly startBlocks = new Map<string, bigint>();
  private lastKnownCount = -1;

  constructor(private readonly addressesRepository: AddressesRepository) {}

  async onModuleInit() {
    await this.reload();
  }

  async reload(): Promise<void> {
    const rows = await this.addressesRepository.findAll();
    this.startBlocks.clear();
    for (const row of rows) {
      this.startBlocks.set(row.address, BigInt(row.startBlock));
    }
    this.lastKnownCount = rows.length;
    this.logger.log(`watch set loaded: ${this.startBlocks.size} addresses`);
  }

  /** Cheap check so seed/API address inserts are picked up without full scan every tick. */
  async refreshIfChanged(): Promise<void> {
    const count = await this.addressesRepository.count();
    if (count !== this.lastKnownCount) {
      await this.reload();
    }
  }

  add(address: string, startBlock: bigint): void {
    this.startBlocks.set(address.toLowerCase(), startBlock);
    this.lastKnownCount = this.startBlocks.size;
  }

  has(address: string): boolean {
    return this.startBlocks.has(address.toLowerCase());
  }

  startBlock(address: string): bigint | undefined {
    return this.startBlocks.get(address.toLowerCase());
  }

  size(): number {
    return this.startBlocks.size;
  }
}
