import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { IndexerModule } from '../indexer/indexer.module';

@Module({
  imports: [IndexerModule],
  controllers: [AdminController],
})
export class AdminModule {}
