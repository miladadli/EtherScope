import { CommandFactory } from 'nest-commander';
import { CliModule } from './cli.module';

async function bootstrap() {
  process.env.ENABLE_INDEXER = 'false';
  process.env.ENABLE_BALANCE_WORKER = 'false';
  await CommandFactory.run(CliModule, {
    logger: ['error', 'warn', 'log'],
  });
}

void bootstrap();
