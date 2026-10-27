import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EthereumService } from '../ethereum/ethereum.service';
import { TransfersRepository } from '../transfers/transfers.repository';
import { BalancesRepository } from '../balances/balances.repository';
import { IndexedBlocksRepository } from './indexed-blocks.repository';
import { IndexerStateService } from './indexer-state.service';

@Injectable()
export class ReorgService {
  private readonly logger = new Logger(ReorgService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly ethereum: EthereumService,
    private readonly transfersRepository: TransfersRepository,
    private readonly balancesRepository: BalancesRepository,
    private readonly indexedBlocksRepository: IndexedBlocksRepository,
    private readonly indexerStateService: IndexerStateService,
  ) {}

  async findForkParent(lastBlock: bigint): Promise<bigint> {
    const client = this.ethereum.getClient();
    const tip = await client.getBlockNumber();
    let n = lastBlock > tip ? tip : lastBlock;

    while (n >= 0n) {
      const local = await this.indexedBlocksRepository.findByNumber(n.toString());
      if (!local) {
        if (n === 0n) {
          break;
        }
        n -= 1n;
        continue;
      }

      let remoteHash: string | null = null;
      try {
        const remote = await client.getBlock({ blockNumber: n });
        remoteHash = remote.hash ?? null;
      } catch {
        if (n === 0n) {
          break;
        }
        n -= 1n;
        continue;
      }

      if (remoteHash && remoteHash.toLowerCase() === local.blockHash.toLowerCase()) {
        return n;
      }
      if (n === 0n) {
        break;
      }
      n -= 1n;
    }

    throw new Error('no common ancestor found for reorg');
  }

  async rollbackTo(forkParent: bigint): Promise<void> {
    const f = forkParent.toString();
    this.logger.warn(`rolling back index to block ${f}`);

    await this.dataSource.transaction(async (manager) => {
      const touched = await this.transfersRepository.markReorgedAfter(manager, f);
      await this.indexedBlocksRepository.deleteAfter(manager, f);
      await this.balancesRepository.deleteWhereBalanceBlockAfter(manager, f);
      await this.balancesRepository.markDirtyAddresses(manager, touched);

      if (forkParent < 0n) {
        throw new Error('invalid fork parent');
      }

      if (forkParent === 0n) {
        const genesis = await this.indexedBlocksRepository.findByNumber('0');
        if (!genesis) {
          await this.indexerStateService.saveState(
            manager,
            '0',
            '0x0000000000000000000000000000000000000000000000000000000000000000',
          );
          return;
        }
        await this.indexerStateService.saveState(
          manager,
          genesis.blockNumber,
          genesis.blockHash,
        );
        return;
      }

      const parent = await this.indexedBlocksRepository.findByNumber(f);
      if (!parent) {
        throw new Error(`fork parent ${f} missing after rollback prep`);
      }
      await this.indexerStateService.saveState(
        manager,
        parent.blockNumber,
        parent.blockHash,
      );
    });
  }
}
