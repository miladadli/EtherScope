import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { EthereumModule } from './ethereum/ethereum.module';
import { SeederModule } from './seeder/seeder.module';

@Module({
  imports: [AppConfigModule, DatabaseModule, EthereumModule, SeederModule],
})
export class CliModule {}
