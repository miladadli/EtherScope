import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createWalletClient,
  getAddress,
  http,
  parseEther,
  type Account,
  type Chain,
  type WalletClient,
} from 'viem';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import { foundry } from 'viem/chains';
import { DataSource } from 'typeorm';
import type { Env } from '../config/env.schema';
import { AddressesRepository } from '../addresses/addresses.repository';
import { TokensService } from '../tokens/tokens.service';
import { EthereumService } from '../ethereum/ethereum.service';
import { BalancesService } from '../balances/balances.service';
import { BalancesRepository } from '../balances/balances.repository';
import { ETH_TOKEN_SENTINEL } from '../balances/balance.entity';
import { mockErc20Abi, mockErc20Bytecode } from './mock-erc20';

const ANVIL_DEPLOYER_KEY =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' as const;

const INSERT_CHUNK = 5000;

export type SeedOptions = {
  count?: number;
  activeRatio?: number;
};

@Injectable()
export class SeederService {
  private readonly logger = new Logger(SeederService.name);

  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly addressesRepository: AddressesRepository,
    private readonly tokensService: TokensService,
    private readonly ethereum: EthereumService,
    private readonly balancesService: BalancesService,
    private readonly balancesRepository: BalancesRepository,
    private readonly dataSource: DataSource,
  ) {}

  async seed(options: SeedOptions = {}): Promise<void> {
    const max = this.config.get('MAX_SEED_COUNT', { infer: true });
    const target =
      options.count ?? this.config.get('SEED_DEFAULT_COUNT', { infer: true }) ?? 1000;
    const activeRatio = options.activeRatio ?? 0.01;

    if (target > max) {
      throw new Error(`count ${target} exceeds MAX_SEED_COUNT (${max})`);
    }
    if (activeRatio < 0 || activeRatio > 1) {
      throw new Error('activeRatio must be between 0 and 1');
    }

    const tip = await this.ethereum.getBlockNumber();
    const startBlock = (tip + 1n).toString();

    this.logger.log(
      `seeding ${target} addresses (activeRatio=${activeRatio}, startBlock=${startBlock})`,
    );

    const wallets: Array<{ address: string; account: Account }> = [];
    for (let i = 0; i < target; i++) {
      const account = privateKeyToAccount(generatePrivateKey());
      wallets.push({
        address: account.address.toLowerCase(),
        account,
      });
    }

    for (let i = 0; i < wallets.length; i += INSERT_CHUNK) {
      const chunk = wallets.slice(i, i + INSERT_CHUNK).map((w) => ({
        address: w.address,
        startBlock,
      }));
      await this.addressesRepository.insertMany(chunk);
      this.logger.log(
        `inserted addresses ${i + 1}-${Math.min(i + INSERT_CHUNK, wallets.length)}`,
      );
    }

    const activeCount = Math.max(1, Math.floor(target * activeRatio));
    const active = wallets.slice(0, activeCount);

    const deployerAccount = privateKeyToAccount(ANVIL_DEPLOYER_KEY);
    const deployer = this.createWallet(deployerAccount);
    const tokenA = await this.deployToken(deployer, deployerAccount, 'Alpha', 'ALP');
    const tokenB = await this.deployToken(deployer, deployerAccount, 'Beta', 'BET');

    await this.tokensService.registerToken({
      address: tokenA,
      symbol: 'ALP',
      decimals: 18,
    });
    await this.tokensService.registerToken({
      address: tokenB,
      symbol: 'BET',
      decimals: 18,
    });
    this.logger.log(`tokens deployed: ${tokenA}, ${tokenB}`);

    const progressEvery = Math.max(1, Math.min(25, Math.ceil(activeCount / 10)));
    this.logger.log(
      `funding ${activeCount} active addresses (~${3 * activeCount + 3} anvil txs)`,
    );

    for (let i = 0; i < active.length; i++) {
      const w = active[i]!;
      const hash = await deployer.sendTransaction({
        account: deployerAccount,
        chain: deployer.chain,
        to: getAddress(w.address),
        value: parseEther('2'),
      });
      await this.ethereum.getClient().waitForTransactionReceipt({ hash });
      if ((i + 1) % progressEvery === 0 || i + 1 === active.length) {
        this.logger.log(`funded ETH ${i + 1}/${activeCount}`);
      }
    }

    this.logger.log(`minting ALP/BET for ${activeCount} active addresses`);
    for (let i = 0; i < active.length; i++) {
      const w = active[i]!;
      await this.mint(deployer, deployerAccount, tokenA, w.address, parseEther('1000'));
      await this.mint(deployer, deployerAccount, tokenB, w.address, parseEther('500'));
      if ((i + 1) % progressEvery === 0 || i + 1 === active.length) {
        this.logger.log(`minted tokens ${i + 1}/${activeCount}`);
      }
    }

    if (active.length >= 2) {
      const [a, b] = active;
      const walletA = this.createWallet(a.account);
      this.logger.log(`sample transfers ${a.address} → ${b.address}`);

      const ethHash = await walletA.sendTransaction({
        account: a.account,
        chain: walletA.chain,
        to: getAddress(b.address),
        value: parseEther('0.25'),
      });
      await this.ethereum.getClient().waitForTransactionReceipt({ hash: ethHash });

      await this.transferToken(walletA, a.account, tokenA, b.address, parseEther('10'));
      await this.transferToken(walletA, a.account, tokenB, b.address, parseEther('5'));
    }

    const fundBlock = await this.ethereum.getBlockNumber();
    this.logger.log(`snapshotting balances for ${activeCount} addresses at ${fundBlock}`);
    await this.snapshotActiveBalances(
      active.map((w) => w.address),
      [tokenA, tokenB],
      fundBlock,
    );

    this.logger.log(
      `seed complete: ${target} watched, ${activeCount} active, tip=${fundBlock}`,
    );
  }

  private createWallet(account: Account): WalletClient {
    const rpcUrl = this.config.get('RPC_URL', { infer: true });
    const chain: Chain = {
      ...foundry,
      rpcUrls: { default: { http: [rpcUrl] } },
    };
    return createWalletClient({
      account,
      chain,
      transport: http(rpcUrl),
    });
  }

  private async deployToken(
    wallet: WalletClient,
    account: Account,
    name: string,
    symbol: string,
  ): Promise<string> {
    const hash = await wallet.deployContract({
      account,
      chain: wallet.chain,
      abi: mockErc20Abi,
      bytecode: mockErc20Bytecode,
      args: [name, symbol],
    });
    const receipt = await this.ethereum.getClient().waitForTransactionReceipt({ hash });
    if (!receipt.contractAddress) {
      throw new Error(`deploy ${symbol} missing contract address`);
    }
    return receipt.contractAddress.toLowerCase();
  }

  private async mint(
    wallet: WalletClient,
    account: Account,
    token: string,
    to: string,
    amount: bigint,
  ): Promise<void> {
    const hash = await wallet.writeContract({
      account,
      chain: wallet.chain,
      address: getAddress(token),
      abi: mockErc20Abi,
      functionName: 'mint',
      args: [getAddress(to), amount],
    });
    await this.ethereum.getClient().waitForTransactionReceipt({ hash });
  }

  private async transferToken(
    wallet: WalletClient,
    account: Account,
    token: string,
    to: string,
    amount: bigint,
  ): Promise<void> {
    const hash = await wallet.writeContract({
      account,
      chain: wallet.chain,
      address: getAddress(token),
      abi: mockErc20Abi,
      functionName: 'transfer',
      args: [getAddress(to), amount],
    });
    await this.ethereum.getClient().waitForTransactionReceipt({ hash });
  }

  private async snapshotActiveBalances(
    addresses: string[],
    tokens: string[],
    blockNumber: bigint,
  ): Promise<void> {
    const pairs = addresses.flatMap((address) => [
      { address, tokenAddress: ETH_TOKEN_SENTINEL },
      ...tokens.map((tokenAddress) => ({ address, tokenAddress })),
    ]);

    await this.dataSource.transaction(async (manager) => {
      await this.balancesRepository.markDirty(manager, pairs);
    });
    await this.balancesService.refreshDirtyAt(blockNumber);
  }
}
