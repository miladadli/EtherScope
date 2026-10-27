# EtherScope

NestJS indexer that watches Ethereum addresses for native ETH and configured ERC-20 transfers. Local demo runs on Anvil + PostgreSQL with crash-safe checkpoints and reorg handling.

## Stack

- NestJS, TypeORM, PostgreSQL 16
- Viem
- Foundry Anvil

No Redis/Kafka in v1 — in-process WatchSet, Postgres advisory lock, and DB-backed balance cache are enough for this scale.

## Quick start

```bash
cp .env.example .env
docker compose up -d
npm install
npm run migration:run
npm run start:dev
```

| | URL |
|--|-----|
| Health | `GET http://localhost:3000/health` |
| Swagger | http://localhost:3000/docs |
| Indexer status | `GET http://localhost:3000/admin/indexer` |

Requires Docker (Postgres + Anvil on `:5432` / `:8545`). Anvil uses `--block-time 1`.

### Seed

Run **while the API may be up** — the CLI forces `ENABLE_INDEXER=false` so it does not take the advisory lock.

```bash
# small demo
npm run seed -- --count=1000 --active-ratio=0.01

# take-home scale (~100k watched; keep activeRatio small on Anvil)
npm run seed -- --count=100000 --active-ratio=0.001
```

On PowerShell, if flags are ignored, call the CLI directly:

```bash
npx ts-node -r tsconfig-paths/register src/cli.ts seed --count 100000 --active-ratio 0.001
```

What seed does:

1. Inserts watched addresses (`start_block = tip + 1`) in chunks of 5000  
2. Deploys mock ERC-20s **ALP** / **BET** and registers them in `tokens`  
3. Sequentially funds + mints a small **active** subset on Anvil (waits each receipt; progress logged)  
4. Sends a few sample transfers, then Multicall-snapshots balances for actives  

`transfers.asset` is only `eth` | `erc20`; the specific token is `token_address` (join `tokens` for ALP/BET symbols).

### API

| Method | Path | Notes |
|--------|------|--------|
| GET | `/health` | DB + RPC + indexer running + tip / last indexed |
| GET | `/addresses/:address/sync` | `startBlock`, indexer checkpoint, tip |
| GET | `/addresses/:address/transfers` | default `active`; `?includeReorged=true`; cursor via `cursorBlock` / `cursorLogIndex` |
| GET | `/addresses/:address/balances` | Multicall only for missing/dirty rows; indexer refreshes dirty at safeTip; `token: "ETH"` or contract |
| GET | `/admin/indexer` | running, WatchSet size, checkpoint, tip |

### Observability (v1)

Structured Nest `Logger` on lifecycle paths: indexer start/stop, advisory lock, batch index, reorg rollback, RPC tick failure + backoff, Multicall3 install, seed phases/progress, balance read failures.

Operational reads: `/health`, `/admin/indexer`, `/docs`. No Prometheus/OpenTelemetry in v1 (enough for the take-home).

## Layout

Feature modules: controller → service → repository. Indexer and seeder call services only.

## Tests (need Docker stack running)

```bash
npm run test:idempotency
npm run test:reorg
# or all e2e:
npm run test:e2e
```

- **idempotency** — rewind checkpoint and reprocess; active transfer count unchanged  
- **reorg** — `evm_snapshot` → index a tx → `evm_revert` → transfers become `reorged`

Stop `start:dev` before e2e if you want a quieter DB (tests run their own Nest context with indexer loop disabled and call `processOnce()`).

## Design notes (interview)

**Throughput:** filter early with an in-memory WatchSet, batch writes per block range, keep the connection pool capped (`DB_POOL_MAX`). Scale claims need a benchmark; 100k quiet addresses is mostly a lookup/filter problem, not a Kafka problem.

**DB slow under backup:** keep backups off the hot primary when possible (replica / volume snapshot). Cap pool size and statement timeouts so a slow disk cannot exhaust connections. Prefer shedding ingest work over locking the whole process.

**Balances:** history comes from indexed transfers; balances are read from chain (Multicall3) for touched/dirty addresses so gas fees are not mis-accounted by naive deltas.

**Reorg:** index only to `safeTip = tip − CONFIRMATION_DEPTH`; store `indexed_blocks` hashes; on mismatch / tip regression, soft-mark transfers `reorged` and rewind checkpoint.

## Status

- Schema, health/API, Swagger  
- ETH + ERC-20 indexer, atomic checkpoint, reorg rollback  
- Multicall balances + lazy GET  
- Seeder CLI (up to 100k)  
- Retry/backoff, shutdown hooks, advisory lock  
- e2e: idempotency + reorg  
