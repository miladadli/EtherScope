import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransferEntity } from './transfer.entity';
import { TransfersRepository } from './transfers.repository';
import { TransfersService } from './transfers.service';
import { TransfersController } from './transfers.controller';
import { AddressesCoreModule } from '../addresses/addresses-core.module';

@Module({
  imports: [TypeOrmModule.forFeature([TransferEntity]), AddressesCoreModule],
  controllers: [TransfersController],
  providers: [TransfersRepository, TransfersService],
  exports: [TransfersRepository, TransfersService],
})
export class TransfersModule {}
