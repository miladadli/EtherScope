import { INestApplicationContext } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { createWalletClient, http, parseEther, type Hash, type Hex } from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { foundry } from 'viem/chains';
import { createAppContext } from './helpers/app-context';
import { IndexerService } from '../src/indexer/indexer.service';
import { AddressesRepository } from '../src/addresses/addresses.repository';
import { EthereumService } from '../src/ethereum/ethereum.service';

const DEPLOYER =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' as const;

async function anvilSnapshot(rpcUrl: string): Promise<Hex> {
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'evm_snapshot',
      params: [],
    }),
  });
  const json = (await res.json()) as { result: Hex };
  return json.result;
}

async function anvilRevert(rpcUrl: string, id: Hex): Promise<void> {
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'evm_revert',
      params: [id],
    }),
  });
  const json = (await res.json()) as { result: boolean };
  if (!json.result) {
    throw new Error('evm_revert failed');
  }
}

describe('reorg handling', () => {
  let app: INestApplicationContext;
  const rpcUrl = process.env.RPC_URL ?? 'http://127.0.0.1:8545';

  beforeAll(async () => {
    app = await createAppContext();
  }, 60_000);

  afterAll(async () => {
    await app.close();
  });

  it('marks transfers reorged when tip regresses via evm_revert', async () => {
    const ethereum = app.get(EthereumService);
    const addresses = app.get(AddressesRepository);
    const indexer = app.get(IndexerService);
    const db = app.get(DataSource);

    const recipient = privateKeyToAccount(generatePrivateKey()).address;
    const tip = await ethereum.getBlockNumber();
    const from = privateKeyToAccount(DEPLOYER).address.toLowerCase();

    await addresses.insertMany([
      { address: from, startBlock: tip.toString() },
      { address: recipient.toLowerCase(), startBlock: tip.toString() },
    ]);

    // catch up so checkpoint is near tip before branching
    for (let i = 0; i < 6; i++) {
      await indexer.processOnce();
    }

    const snap = await anvilSnapshot(rpcUrl);

    const wallet = createWalletClient({
      account: privateKeyToAccount(DEPLOYER),
      chain: foundry,
      transport: http(rpcUrl),
    });
    const hash: Hash = await wallet.sendTransaction({
      to: recipient,
      value: parseEther('0.02'),
    });
    await ethereum.getClient().waitForTransactionReceipt({ hash });

    for (let i = 0; i < 12; i++) {
      await indexer.processOnce();
    }

    const activeBefore = await db.query(
      `SELECT count(*)::int AS c FROM transfers WHERE tx_hash = $1 AND status = 'active'`,
      [hash],
    );
    expect(activeBefore[0].c).toBeGreaterThanOrEqual(1);

    await anvilRevert(rpcUrl, snap);
    // let anvil settle after tip regression
    await new Promise((r) => setTimeout(r, 1500));

    let sawRollback = false;
    for (let i = 0; i < 20; i++) {
      try {
        await indexer.processOnce();
        sawRollback = true;
      } catch (err) {
        // keep trying while chain/tip settles
        if (i === 19) {
          throw err;
        }
        await new Promise((r) => setTimeout(r, 500));
      }
    }
    expect(sawRollback).toBe(true);

    const activeAfter = await db.query(
      `SELECT count(*)::int AS c FROM transfers WHERE tx_hash = $1 AND status = 'active'`,
      [hash],
    );
    const reorged = await db.query(
      `SELECT count(*)::int AS c FROM transfers WHERE tx_hash = $1 AND status = 'reorged'`,
      [hash],
    );

    expect(activeAfter[0].c).toBe(0);
    expect(reorged[0].c).toBeGreaterThanOrEqual(1);
  }, 180_000);
});
