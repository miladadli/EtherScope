import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { IndexedBlockEntity } from './indexed-block.entity';

@Injectable()
export class IndexedBlocksRepository {
  constructor(
    @InjectRepository(IndexedBlockEntity)
    private readonly repo: Repository<IndexedBlockEntity>,
  ) {}

  findByNumber(blockNumber: string): Promise<IndexedBlockEntity | null> {
    return this.repo.findOne({ where: { blockNumber } });
  }

  async insertMany(
    manager: EntityManager,
    rows: Array<Pick<IndexedBlockEntity, 'blockNumber' | 'blockHash' | 'parentHash'>>,
  ): Promise<void> {
    if (rows.length === 0) {
      return;
    }
    await manager
      .createQueryBuilder()
      .insert()
      .into(IndexedBlockEntity)
      .values(rows)
      .orIgnore()
      .execute();
  }

  async deleteAfter(manager: EntityManager, blockNumber: string): Promise<void> {
    await manager
      .createQueryBuilder()
      .delete()
      .from(IndexedBlockEntity)
      .where('block_number > :blockNumber', { blockNumber })
      .execute();
  }

  async pruneBefore(manager: EntityManager, keepFrom: string): Promise<void> {
    await manager
      .createQueryBuilder()
      .delete()
      .from(IndexedBlockEntity)
      .where('block_number < :keepFrom', { keepFrom })
      .execute();
  }
}
