import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TokenEntity } from './token.entity';

@Injectable()
export class TokensRepository {
  constructor(
    @InjectRepository(TokenEntity)
    private readonly repo: Repository<TokenEntity>,
  ) {}

  findEnabled(): Promise<TokenEntity[]> {
    return this.repo.find({ where: { enabled: true } });
  }

  async upsertToken(
    row: Pick<TokenEntity, 'address' | 'symbol' | 'decimals' | 'enabled'>,
  ): Promise<void> {
    await this.repo.upsert(row, ['address']);
  }
}
