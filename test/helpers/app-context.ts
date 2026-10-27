import { Test } from '@nestjs/testing';
import { INestApplicationContext } from '@nestjs/common';
import { config as loadEnv } from 'dotenv';
import { AppModule } from '../../src/app.module';

loadEnv();

export async function createAppContext(): Promise<INestApplicationContext> {
  process.env.ENABLE_INDEXER = 'false';
  process.env.CONFIRMATION_DEPTH = '0';
  process.env.POLL_INTERVAL_MS = '200';

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  await moduleRef.init();
  return moduleRef;
}
