import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'pg';
import type { Env } from '../config/env.schema';

const LOCK_KEY = 748_291_553;

@Injectable()
export class IndexerLockService implements OnModuleDestroy {
  private readonly logger = new Logger(IndexerLockService.name);
  private client: Client | null = null;
  private held = false;

  constructor(private readonly config: ConfigService<Env, true>) {}

  async tryAcquire(): Promise<boolean> {
    if (this.held) {
      return true;
    }

    const client = new Client({
      connectionString: this.config.get('DATABASE_URL', { infer: true }),
    });
    await client.connect();

    const result = await client.query<{ locked: boolean }>(
      'SELECT pg_try_advisory_lock($1) AS locked',
      [LOCK_KEY],
    );

    if (!result.rows[0]?.locked) {
      await client.end();
      this.logger.warn('another indexer holds the advisory lock');
      return false;
    }

    this.client = client;
    this.held = true;
    this.logger.log('indexer advisory lock acquired');
    return true;
  }

  async release(): Promise<void> {
    if (!this.client || !this.held) {
      return;
    }
    try {
      await this.client.query('SELECT pg_advisory_unlock($1)', [LOCK_KEY]);
    } finally {
      await this.client.end();
      this.client = null;
      this.held = false;
    }
  }

  async onModuleDestroy() {
    await this.release();
  }
}
