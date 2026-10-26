import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createPublicClient,
  http,
  type PublicClient,
  type Chain,
} from 'viem';
import { foundry } from 'viem/chains';
import type { Env } from '../config/env.schema';

@Injectable()
export class EthereumService implements OnModuleDestroy {
  private readonly client: PublicClient;

  constructor(config: ConfigService<Env, true>) {
    const rpcUrl = config.get('RPC_URL', { infer: true });
    const chain: Chain = {
      ...foundry,
      rpcUrls: {
        default: { http: [rpcUrl] },
      },
    };

    this.client = createPublicClient({
      chain,
      transport: http(rpcUrl),
    });
  }

  getClient(): PublicClient {
    return this.client;
  }

  getBlockNumber(): Promise<bigint> {
    return this.client.getBlockNumber();
  }

  async isReachable(): Promise<boolean> {
    try {
      await this.client.getBlockNumber();
      return true;
    } catch {
      return false;
    }
  }

  onModuleDestroy() {
    // http transport has nothing to close explicitly
  }
}
