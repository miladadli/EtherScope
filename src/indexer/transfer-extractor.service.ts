import { Injectable, Logger } from '@nestjs/common';
import {
  type Hash,
  type Transaction,
  type TransactionReceipt,
  decodeEventLog,
  erc20Abi,
  parseAbiItem,
} from 'viem';
import { EthereumService } from '../ethereum/ethereum.service';
import { WatchSetService } from './watch-set.service';
import { TransferAsset } from '../transfers/transfer.entity';
import type { NewTransferRow } from '../transfers/transfers.repository';

const TRANSFER_EVENT = parseAbiItem(
  'event Transfer(address indexed from, address indexed to, uint256 value)',
);

export type ExtractedBatch = {
  blocks: Array<{
    blockNumber: string;
    blockHash: string;
    parentHash: string;
  }>;
  transfers: NewTransferRow[];
  touchedEth: string[];
  touchedTokenPairs: Array<{ address: string; tokenAddress: string }>;
};

@Injectable()
export class TransferExtractorService {
  private readonly logger = new Logger(TransferExtractorService.name);

  constructor(
    private readonly ethereum: EthereumService,
    private readonly watchSet: WatchSetService,
  ) {}

  async extractRange(
    from: bigint,
    to: bigint,
    tokenAddresses: `0x${string}`[],
  ): Promise<ExtractedBatch> {
    const client = this.ethereum.getClient();
    const blocks: ExtractedBatch['blocks'] = [];
    const transfers: NewTransferRow[] = [];
    const touchedEth = new Set<string>();
    const touchedTokenPairs = new Set<string>();
    const blockHashByNumber = new Map<string, string>();

    for (let n = from; n <= to; n++) {
      const block = await client.getBlock({
        blockNumber: n,
        includeTransactions: true,
      });
      const blockHash = block.hash!;
      blocks.push({
        blockNumber: n.toString(),
        blockHash,
        parentHash: block.parentHash,
      });
      blockHashByNumber.set(n.toString(), blockHash);

      const txs = block.transactions as Transaction[];
      const candidates = txs.filter((tx) => {
        if (tx.value === 0n) {
          return false;
        }
        const fromAddr = tx.from.toLowerCase();
        const toAddr = tx.to?.toLowerCase() ?? null;
        return this.sideWatched(fromAddr, n) || this.sideWatched(toAddr, n);
      });

      const receipts = await this.fetchReceipts(candidates.map((tx) => tx.hash));
      for (const receipt of receipts) {
        if (receipt.status !== 'success') {
          continue;
        }
        const tx = candidates.find((t) => t.hash === receipt.transactionHash);
        if (!tx || tx.value === 0n) {
          continue;
        }
        const fromAddr = tx.from.toLowerCase();
        const toAddr = tx.to?.toLowerCase() ?? null;
        const includeFrom = this.sideWatched(fromAddr, n);
        const includeTo = this.sideWatched(toAddr, n);
        if (!includeFrom && !includeTo) {
          continue;
        }

        transfers.push({
          txHash: tx.hash,
          logIndex: -1,
          blockNumber: n.toString(),
          blockHash,
          fromAddress: fromAddr,
          toAddress: toAddr,
          asset: TransferAsset.Eth,
          tokenAddress: null,
          value: tx.value.toString(),
        });
        if (includeFrom) {
          touchedEth.add(fromAddr);
        }
        if (includeTo && toAddr) {
          touchedEth.add(toAddr);
        }
      }
    }

    if (tokenAddresses.length > 0) {
      const logs = await client.getLogs({
        address: tokenAddresses,
        event: TRANSFER_EVENT,
        fromBlock: from,
        toBlock: to,
      });

      for (const log of logs) {
        const expectedHash = blockHashByNumber.get(log.blockNumber.toString());
        if (!expectedHash || log.blockHash.toLowerCase() !== expectedHash.toLowerCase()) {
          continue;
        }

        let fromAddr: string;
        let toAddr: string;
        let value: bigint;
        try {
          const decoded = decodeEventLog({
            abi: erc20Abi,
            data: log.data,
            topics: log.topics,
          });
          if (decoded.eventName !== 'Transfer') {
            continue;
          }
          fromAddr = (decoded.args.from as string).toLowerCase();
          toAddr = (decoded.args.to as string).toLowerCase();
          value = decoded.args.value as bigint;
        } catch {
          continue;
        }

        const blockNum = log.blockNumber;
        const includeFrom = this.sideWatched(fromAddr, blockNum);
        const includeTo = this.sideWatched(toAddr, blockNum);
        if (!includeFrom && !includeTo) {
          continue;
        }

        const token = log.address.toLowerCase();
        transfers.push({
          txHash: log.transactionHash,
          logIndex: log.logIndex,
          blockNumber: blockNum.toString(),
          blockHash: log.blockHash,
          fromAddress: fromAddr,
          toAddress: toAddr,
          asset: TransferAsset.Erc20,
          tokenAddress: token,
          value: value.toString(),
        });

        if (includeFrom) {
          touchedTokenPairs.add(`${fromAddr}|${token}`);
        }
        if (includeTo) {
          touchedTokenPairs.add(`${toAddr}|${token}`);
        }
      }
    }

    this.logger.debug(`extracted ${transfers.length} transfers in blocks ${from}-${to}`);

    return {
      blocks,
      transfers,
      touchedEth: [...touchedEth],
      touchedTokenPairs: [...touchedTokenPairs].map((key) => {
        const [address, tokenAddress] = key.split('|');
        return { address, tokenAddress };
      }),
    };
  }

  private sideWatched(address: string | null, blockNumber: bigint): boolean {
    if (!address) {
      return false;
    }
    const start = this.watchSet.startBlock(address);
    if (start === undefined) {
      return false;
    }
    return blockNumber >= start;
  }

  private async fetchReceipts(hashes: Hash[]): Promise<TransactionReceipt[]> {
    if (hashes.length === 0) {
      return [];
    }
    const client = this.ethereum.getClient();
    const chunkSize = 20;
    const out: TransactionReceipt[] = [];
    for (let i = 0; i < hashes.length; i += chunkSize) {
      const chunk = hashes.slice(i, i + chunkSize);
      const part = await Promise.all(
        chunk.map((hash) => client.getTransactionReceipt({ hash })),
      );
      out.push(...part);
    }
    return out;
  }
}
