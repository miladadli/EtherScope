import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { AddressesService } from '../addresses/addresses.service';
import { ETH_TOKEN_SENTINEL } from './balance.entity';
import { BalancesRepository } from './balances.repository';
import { EthereumService } from '../ethereum/ethereum.service';
import {
  MulticallService,
  type BalanceReadRequest,
} from '../ethereum/multicall.service';
import { TokensService } from '../tokens/tokens.service';
import type { Env } from '../config/env.schema';
import { parseTokenAddresses } from '../config/env.schema';

@Injectable()
export class BalancesService {
  private readonly logger = new Logger(BalancesService.name);
  private readonly inflight = new Map<string, Promise<void>>();

  constructor(
    private readonly balancesRepository: BalancesRepository,
    private readonly addressesService: AddressesService,
    private readonly ethereumService: EthereumService,
    private readonly multicall: MulticallService,
    private readonly tokensService: TokensService,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async getBalances(address: string) {
    const watched = await this.addressesService.getOrThrow(address);
    const tip = await this.ethereumService.getBlockNumber();
    const depth = BigInt(
      this.config.get('CONFIRMATION_DEPTH', { infer: true }),
    );
    const safeTip = tip > depth ? tip - depth : 0n;

    let rows = await this.balancesRepository.findForAddress(watched.address);
    const tokenAddrs = await this.resolveTokenAddresses();
    const wanted = this.wantedPairs(watched.address, tokenAddrs, rows);

    // Only missing/dirty rows hit RPC on GET; indexer refreshes dirty at safeTip.
    const stale = wanted.filter((pair) => {
      const row = rows.find(
        (r) =>
          r.address === pair.address && r.tokenAddress === pair.tokenAddress,
      );
      return !row || row.dirty;
    });

    if (stale.length > 0) {
      await this.refreshPairs(stale, safeTip);
      rows = await this.balancesRepository.findForAddress(watched.address);
    }

    const byToken = new Map(rows.map((r) => [r.tokenAddress, r]));
    const balances = wanted.map((pair) => {
      const row = byToken.get(pair.tokenAddress);
      if (!row || row.dirty) {
        return {
          token:
            pair.tokenAddress === ETH_TOKEN_SENTINEL
              ? 'ETH'
              : pair.tokenAddress,
          balance: null as string | null,
          balanceBlock: row?.balanceBlock ?? null,
          dirty: true,
        };
      }
      return {
        token:
          pair.tokenAddress === ETH_TOKEN_SENTINEL ? 'ETH' : pair.tokenAddress,
        balance: row.balance,
        balanceBlock: row.balanceBlock,
        dirty: false,
      };
    });

    return {
      address: watched.address,
      latestBlock: tip.toString(),
      safeTip: safeTip.toString(),
      balances,
    };
  }

  async refreshDirtyAt(blockNumber: bigint): Promise<number> {
    const dirty = await this.balancesRepository.findDirty();
    if (dirty.length === 0) {
      return 0;
    }
    const pairs = dirty.map((d) => ({
      address: d.address,
      tokenAddress: d.tokenAddress,
    }));
    await this.refreshPairs(pairs, blockNumber);
    return pairs.length;
  }

  private wantedPairs(
    address: string,
    tokens: string[],
    existing: Array<{ tokenAddress: string }>,
  ): BalanceReadRequest[] {
    const set = new Set<string>([ETH_TOKEN_SENTINEL, ...tokens]);
    for (const row of existing) {
      set.add(row.tokenAddress);
    }
    return [...set].map((tokenAddress) => ({ address, tokenAddress }));
  }

  private async refreshPairs(
    pairs: BalanceReadRequest[],
    blockNumber: bigint,
  ): Promise<void> {
    const key = `${blockNumber}:${pairs
      .map((p) => `${p.address}:${p.tokenAddress}`)
      .sort()
      .join(',')}`;

    const existing = this.inflight.get(key);
    if (existing) {
      await existing;
      return;
    }

    const job = this.doRefresh(pairs, blockNumber).finally(() => {
      this.inflight.delete(key);
    });
    this.inflight.set(key, job);
    await job;
  }

  private async doRefresh(
    pairs: BalanceReadRequest[],
    blockNumber: bigint,
  ): Promise<void> {
    const reads = await this.multicall.readBalances(pairs, blockNumber);

    await this.dataSource.transaction(async (manager) => {
      for (const read of reads) {
        if (read.balance === null) {
          this.logger.warn(
            `balance read failed for ${read.address} token=${read.tokenAddress}`,
          );
          continue;
        }
        await this.balancesRepository.upsertFresh(manager, {
          address: read.address,
          tokenAddress: read.tokenAddress,
          balance: read.balance,
          balanceBlock: blockNumber.toString(),
        });
      }
    });
  }

  private async resolveTokenAddresses(): Promise<string[]> {
    const fromDb = await this.tokensService.listEnabled();
    if (fromDb.length > 0) {
      return fromDb.map((t) => t.address.toLowerCase());
    }
    return parseTokenAddresses(
      this.config.get('TOKEN_ADDRESSES', { infer: true }),
    );
  }
}
