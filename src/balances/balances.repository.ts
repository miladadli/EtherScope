import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { BalanceEntity, ETH_TOKEN_SENTINEL } from './balance.entity';

@Injectable()
export class BalancesRepository {
  constructor(
    @InjectRepository(BalanceEntity)
    private readonly repo: Repository<BalanceEntity>,
  ) {}

  findForAddress(address: string): Promise<BalanceEntity[]> {
    return this.repo.find({ where: { address } });
  }

  findOne(
    address: string,
    tokenAddress: string,
  ): Promise<BalanceEntity | null> {
    return this.repo.findOne({ where: { address, tokenAddress } });
  }

  findDirty(): Promise<BalanceEntity[]> {
    return this.repo.find({ where: { dirty: true } });
  }

  async upsertFresh(
    manager: EntityManager,
    row: {
      address: string;
      tokenAddress: string;
      balance: string;
      balanceBlock: string;
    },
  ): Promise<void> {
    const existing = await manager.findOne(BalanceEntity, {
      where: { address: row.address, tokenAddress: row.tokenAddress },
    });

    if (!existing) {
      await manager.insert(BalanceEntity, {
        ...row,
        dirty: false,
      });
      return;
    }

    if (BigInt(row.balanceBlock) < BigInt(existing.balanceBlock)) {
      return;
    }

    existing.balance = row.balance;
    existing.balanceBlock = row.balanceBlock;
    existing.dirty = false;
    await manager.save(existing);
  }

  async markDirty(
    manager: EntityManager,
    pairs: Array<{ address: string; tokenAddress: string }>,
  ): Promise<void> {
    for (const pair of pairs) {
      const existing = await manager.findOne(BalanceEntity, {
        where: {
          address: pair.address,
          tokenAddress: pair.tokenAddress,
        },
      });
      if (existing) {
        existing.dirty = true;
        await manager.save(existing);
      } else {
        await manager.insert(BalanceEntity, {
          address: pair.address,
          tokenAddress: pair.tokenAddress,
          balance: '0',
          balanceBlock: '0',
          dirty: true,
        });
      }
    }
  }

  markDirtyEth(manager: EntityManager, addresses: string[]): Promise<void> {
    return this.markDirty(
      manager,
      addresses.map((address) => ({
        address,
        tokenAddress: ETH_TOKEN_SENTINEL,
      })),
    );
  }

  async deleteWhereBalanceBlockAfter(
    manager: EntityManager,
    blockNumber: string,
  ): Promise<void> {
    await manager
      .createQueryBuilder()
      .delete()
      .from(BalanceEntity)
      .where('balance_block > :blockNumber', { blockNumber })
      .execute();
  }

  async markDirtyAddresses(
    manager: EntityManager,
    addresses: string[],
  ): Promise<void> {
    if (addresses.length === 0) {
      return;
    }
    await manager
      .createQueryBuilder()
      .update(BalanceEntity)
      .set({ dirty: true })
      .where('address IN (:...addresses)', { addresses })
      .execute();
  }
}
