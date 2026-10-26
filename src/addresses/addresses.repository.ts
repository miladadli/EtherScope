import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WatchedAddressEntity } from './watched-address.entity';

@Injectable()
export class AddressesRepository {
  constructor(
    @InjectRepository(WatchedAddressEntity)
    private readonly repo: Repository<WatchedAddressEntity>,
  ) {}

  findByAddress(address: string): Promise<WatchedAddressEntity | null> {
    return this.repo.findOne({ where: { address } });
  }

  findAll(): Promise<WatchedAddressEntity[]> {
    return this.repo.find();
  }

  async insertMany(
    rows: Array<Pick<WatchedAddressEntity, 'address' | 'startBlock'>>,
  ): Promise<void> {
    if (rows.length === 0) {
      return;
    }
    await this.repo
      .createQueryBuilder()
      .insert()
      .into(WatchedAddressEntity)
      .values(rows)
      .orIgnore()
      .execute();
  }

  count(): Promise<number> {
    return this.repo.count();
  }
}
