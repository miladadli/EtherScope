import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository, SelectQueryBuilder } from 'typeorm';
import { TransferAsset, TransferEntity, TransferStatus } from './transfer.entity';

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

type FindOpts = {
  includeReorged: boolean;
  limit: number;
  minBlock: string;
  cursorBlock?: string;
  cursorLogIndex?: number;
};

@Injectable()
export class TransfersRepository {
  constructor(
    @InjectRepository(TransferEntity)
    private readonly repo: Repository<TransferEntity>,
  ) {}

  async upsertActive(manager: EntityManager, rows: NewTransferRow[]): Promise<void> {
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

  async markReorgedAfter(manager: EntityManager, blockNumber: string): Promise<string[]> {
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

  // from/to queried separately so each side can use a composite index
  async findForAddress(address: string, opts: FindOpts): Promise<TransferEntity[]> {
    const [asFrom, asTo] = await Promise.all([
      this.querySide('from_address', address, opts),
      this.querySide('to_address', address, opts),
    ]);

    const byId = new Map<string, TransferEntity>();
    for (const row of asFrom) {
      byId.set(row.id, row);
    }
    for (const row of asTo) {
      byId.set(row.id, row);
    }

    return [...byId.values()]
      .sort((a, b) => {
        const blockCmp = compareBigIntDesc(a.blockNumber, b.blockNumber);
        if (blockCmp !== 0) {
          return blockCmp;
        }
        return b.logIndex - a.logIndex;
      })
      .slice(0, opts.limit);
  }

  private querySide(
    column: 'from_address' | 'to_address',
    address: string,
    opts: FindOpts,
  ): Promise<TransferEntity[]> {
    const qb = this.repo
      .createQueryBuilder('t')
      .where(`t.${column} = :address`, { address })
      .andWhere('t.block_number >= :minBlock', { minBlock: opts.minBlock })
      .orderBy('t.block_number', 'DESC')
      .addOrderBy('t.log_index', 'DESC')
      .take(opts.limit);

    this.applyStatusAndCursor(qb, opts);
    return qb.getMany();
  }

  private applyStatusAndCursor(
    qb: SelectQueryBuilder<TransferEntity>,
    opts: FindOpts,
  ): void {
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
  }
}

function compareBigIntDesc(a: string, b: string): number {
  const left = BigInt(a);
  const right = BigInt(b);
  if (left === right) {
    return 0;
  }
  return left < right ? 1 : -1;
}
