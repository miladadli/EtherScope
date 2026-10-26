import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IndexerStateEntity } from './indexer-state.entity';
import { IndexerStateService } from './indexer-state.service';

@Module({
  imports: [TypeOrmModule.forFeature([IndexerStateEntity])],
  providers: [IndexerStateService],
  exports: [TypeOrmModule, IndexerStateService],
})
export class IndexerStateModule {}
