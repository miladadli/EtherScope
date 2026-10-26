import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  erc20Abi,
  getAddress,
  multicall3Abi,
  type Address,
  type Hex,
} from 'viem';
import { EthereumService } from './ethereum.service';
import {
  MULTICALL3_ADDRESS,
  MULTICALL3_BYTECODE,
} from './multicall3.constants';
import { ETH_TOKEN_SENTINEL } from '../balances/balance.entity';


export type BalanceReadRequest = {
  address: string;
  tokenAddress: string;
};

export type BalanceReadResult = BalanceReadRequest & {
  balance: string | null;
};

@Injectable()
export class MulticallService implements OnModuleInit {
  private readonly logger = new Logger(MulticallService.name);
  private ensured = false;

  constructor(private readonly ethereum: EthereumService) {}

  async onModuleInit() {
    await this.ensureDeployed();
  }

  async ensureDeployed(): Promise<void> {
    if (this.ensured) {
      return;
    }
    const client = this.ethereum.getClient();
    const address = getAddress(MULTICALL3_ADDRESS);
    const code = await client.getCode({ address });
    if (code && code !== '0x') {
      this.ensured = true;
      return;
    }

    await (
      client as unknown as {
        request: (args: {
          method: string;
          params: unknown[];
        }) => Promise<unknown>;
      }
    ).request({
      method: 'anvil_setCode',
      params: [address, MULTICALL3_BYTECODE as Hex],
    });
    this.logger.log('Multicall3 bytecode installed via anvil_setCode');
    this.ensured = true;
  }

  async readBalances(
    requests: BalanceReadRequest[],
    blockNumber: bigint,
  ): Promise<BalanceReadResult[]> {
    if (requests.length === 0) {
      return [];
    }
    await this.ensureDeployed();
    const client = this.ethereum.getClient();

    const multicallAddress = getAddress(MULTICALL3_ADDRESS);
    const contracts = requests.map((req) => {
      const owner = getAddress(req.address);
      if (req.tokenAddress === ETH_TOKEN_SENTINEL) {
        return {
          address: multicallAddress,
          abi: multicall3Abi,
          functionName: 'getEthBalance' as const,
          args: [owner],
        };
      }
      return {
        address: getAddress(req.tokenAddress),
        abi: erc20Abi,
        functionName: 'balanceOf' as const,
        args: [owner],
      };
    });

    const results = await client.multicall({
      contracts,
      allowFailure: true,
      blockNumber,
      multicallAddress,
    });

    return requests.map((req, i) => {
      const item = results[i];
      if (!item || item.status === 'failure') {
        return { ...req, balance: null };
      }
      return { ...req, balance: (item.result as bigint).toString() };
    });
  }
}
