import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import {
  TransferAsset,
  TransferEntity,
  TransferStatus,
} from './transfer.entity';

export type NewTransferRow = {
  txHash: string;
  logIndex: number;
  blockNumber: string;
  blockHash: string;
  fromAddress: string;
  toAddress: string | null;
  asset: TransferAsset;
  tokenAddress: string | null;
  value: string;
};

@Injectable()
export class TransfersRepository {
  constructor(
    @InjectRepository(TransferEntity)
    private readonly repo: Repository<TransferEntity>,
  ) {}

  async upsertActive(
    manager: EntityManager,
    rows: NewTransferRow[],
  ): Promise<void> {
    if (rows.length === 0) {
      return;
    }
    await manager
      .createQueryBuilder()
      .insert()
      .into(TransferEntity)
      .values(
        rows.map((r) => ({
          ...r,
          status: TransferStatus.Active,
        })),
      )
      .orIgnore()
      .execute();
  }

  async markReorgedAfter(
    manager: EntityManager,
    blockNumber: string,
  ): Promise<string[]> {
    const affected = await manager
      .createQueryBuilder(TransferEntity, 't')
      .where('t.block_number > :blockNumber', { blockNumber })
      .andWhere('t.status = :status', { status: TransferStatus.Active })
      .getMany();

    if (affected.length > 0) {
      await manager
        .createQueryBuilder()
        .update(TransferEntity)
        .set({ status: TransferStatus.Reorged })
        .where('block_number > :blockNumber', { blockNumber })
        .andWhere('status = :status', { status: TransferStatus.Active })
        .execute();
    }

    const addresses = new Set<string>();
    for (const row of affected) {
      addresses.add(row.fromAddress);
      if (row.toAddress) {
        addresses.add(row.toAddress);
      }
    }
    return [...addresses];
  }

  async findForAddress(
    address: string,
    opts: {
      includeReorged: boolean;
      limit: number;
      minBlock: string;
      cursorBlock?: string;
      cursorLogIndex?: number;
    },
  ): Promise<TransferEntity[]> {
    const qb = this.repo
      .createQueryBuilder('t')
      .where('(t.from_address = :address OR t.to_address = :address)', {
        address,
      })
      .andWhere('t.block_number >= :minBlock', { minBlock: opts.minBlock })
      .orderBy('t.block_number', 'DESC')
      .addOrderBy('t.log_index', 'DESC')
      .take(opts.limit);

    if (!opts.includeReorged) {
      qb.andWhere('t.status = :status', { status: TransferStatus.Active });
    }

    if (opts.cursorBlock !== undefined && opts.cursorLogIndex !== undefined) {
      qb.andWhere(
        '(t.block_number < :cursorBlock OR (t.block_number = :cursorBlock AND t.log_index < :cursorLogIndex))',
        {
          cursorBlock: opts.cursorBlock,
          cursorLogIndex: opts.cursorLogIndex,
        },
      );
    }

    return qb.getMany();
  }
}
