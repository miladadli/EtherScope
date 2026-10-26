import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { IndexerStateEntity } from './indexer-state.entity';

@Injectable()
export class IndexerStateService {
  constructor(
    @InjectRepository(IndexerStateEntity)
    private readonly repo: Repository<IndexerStateEntity>,
  ) {}

  getState(): Promise<IndexerStateEntity | null> {
    return this.repo.findOne({ where: { id: 1 } });
  }

  async saveState(
    manager: EntityManager,
    lastBlockNumber: string,
    lastBlockHash: string,
  ): Promise<void> {
    await manager.getRepository(IndexerStateEntity).save({
      id: 1,
      lastBlockNumber,
      lastBlockHash,
    });
  }
}
