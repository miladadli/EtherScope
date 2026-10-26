import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WatchedAddressEntity } from './watched-address.entity';
import { AddressesRepository } from './addresses.repository';
import { AddressesService } from './addresses.service';

@Module({
  imports: [TypeOrmModule.forFeature([WatchedAddressEntity])],
  providers: [AddressesRepository, AddressesService],
  exports: [AddressesRepository, AddressesService],
})
export class AddressesCoreModule {}
