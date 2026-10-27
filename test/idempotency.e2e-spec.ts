import { INestApplicationContext } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { createWalletClient, http, parseEther, type Hash } from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { foundry } from 'viem/chains';
import { createAppContext } from './helpers/app-context';
import { IndexerService } from '../src/indexer/indexer.service';
import { IndexerStateService } from '../src/indexer/indexer-state.service';
import { AddressesRepository } from '../src/addresses/addresses.repository';
import { EthereumService } from '../src/ethereum/ethereum.service';

const DEPLOYER =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' as const;

describe('idempotent reindex', () => {
  let app: INestApplicationContext;

  beforeAll(async () => {
    app = await createAppContext();
  }, 60_000);

  afterAll(async () => {
    await app.close();
  });

  it('does not duplicate transfers when the same blocks are processed twice', async () => {
    const ethereum = app.get(EthereumService);
    const addresses = app.get(AddressesRepository);
    const indexer = app.get(IndexerService);
    const state = app.get(IndexerStateService);
    const db = app.get(DataSource);
    const rpcUrl = process.env.RPC_URL ?? 'http://127.0.0.1:8545';

    const recipient = privateKeyToAccount(generatePrivateKey()).address;
    const tip = await ethereum.getBlockNumber();
    const from = privateKeyToAccount(DEPLOYER).address.toLowerCase();

    await addresses.insertMany([
      { address: from, startBlock: tip.toString() },
      { address: recipient.toLowerCase(), startBlock: tip.toString() },
    ]);

    const wallet = createWalletClient({
      account: privateKeyToAccount(DEPLOYER),
      chain: foundry,
      transport: http(rpcUrl),
    });
    const hash: Hash = await wallet.sendTransaction({
      to: recipient,
      value: parseEther('0.01'),
    });
    await ethereum.getClient().waitForTransactionReceipt({ hash });

    for (let i = 0; i < 12; i++) {
      await indexer.processOnce();
    }

    const before = await db.query(
      `SELECT count(*)::int AS c FROM transfers WHERE tx_hash = $1 AND status = 'active'`,
      [hash],
    );
    expect(before[0].c).toBeGreaterThanOrEqual(1);

    const checkpoint = await state.getState();
    expect(checkpoint).toBeTruthy();

    const rewindTo = BigInt(checkpoint!.lastBlockNumber) - 1n;
    if (rewindTo >= 0n) {
      const block = await ethereum.getClient().getBlock({
        blockNumber: rewindTo,
      });
      await db.query(
        `UPDATE indexer_state SET last_block_number = $1, last_block_hash = $2 WHERE id = 1`,
        [rewindTo.toString(), block.hash],
      );
      await db.query(`DELETE FROM indexed_blocks WHERE block_number > $1`, [
        rewindTo.toString(),
      ]);
    }

    for (let i = 0; i < 12; i++) {
      await indexer.processOnce();
    }

    const after = await db.query(
      `SELECT count(*)::int AS c FROM transfers WHERE tx_hash = $1 AND status = 'active'`,
      [hash],
    );
    expect(after[0].c).toBe(before[0].c);
  }, 120_000);
});
