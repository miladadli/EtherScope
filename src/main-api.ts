process.env.ENABLE_INDEXER = 'false';
if (process.env.ENABLE_BALANCE_WORKER === undefined) {
  process.env.ENABLE_BALANCE_WORKER = 'true';
}

import { bootstrapHttp } from './bootstrap';

void bootstrapHttp();
