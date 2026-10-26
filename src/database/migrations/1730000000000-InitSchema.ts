import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1730000000000 implements MigrationInterface {
  name = 'InitSchema1730000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "transfers_asset_enum" AS ENUM ('eth', 'erc20')
    `);
    await queryRunner.query(`
      CREATE TYPE "transfers_status_enum" AS ENUM ('active', 'reorged')
    `);

    await queryRunner.query(`
      CREATE TABLE "watched_addresses" (
        "address" varchar(42) PRIMARY KEY,
        "start_block" bigint NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "tokens" (
        "address" varchar(42) PRIMARY KEY,
        "symbol" varchar(32) NOT NULL,
        "decimals" smallint NOT NULL,
        "enabled" boolean NOT NULL DEFAULT true
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "transfers" (
        "id" bigserial PRIMARY KEY,
        "tx_hash" varchar(66) NOT NULL,
        "log_index" int NOT NULL,
        "block_number" bigint NOT NULL,
        "block_hash" varchar(66) NOT NULL,
        "from_address" varchar(42) NOT NULL,
        "to_address" varchar(42),
        "asset" "transfers_asset_enum" NOT NULL,
        "token_address" varchar(42),
        "value" numeric(78,0) NOT NULL,
        "status" "transfers_status_enum" NOT NULL DEFAULT 'active',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "uq_transfers_tx_log_hash" UNIQUE ("tx_hash", "log_index", "block_hash")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_transfers_from_block" ON "transfers" ("from_address", "block_number")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_transfers_to_block" ON "transfers" ("to_address", "block_number")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_transfers_status_block" ON "transfers" ("status", "block_number")`,
    );

    await queryRunner.query(`
      CREATE TABLE "balances" (
        "address" varchar(42) NOT NULL,
        "token_address" varchar(42) NOT NULL,
        "balance" numeric(78,0) NOT NULL,
        "balance_block" bigint NOT NULL,
        "dirty" boolean NOT NULL DEFAULT false,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY ("address", "token_address")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "indexer_state" (
        "id" int PRIMARY KEY,
        "last_block_number" bigint NOT NULL,
        "last_block_hash" varchar(66) NOT NULL,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "indexed_blocks" (
        "block_number" bigint PRIMARY KEY,
        "block_hash" varchar(66) NOT NULL,
        "parent_hash" varchar(66) NOT NULL,
        "indexed_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "indexed_blocks"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "indexer_state"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "balances"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "transfers"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tokens"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "watched_addresses"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "transfers_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "transfers_asset_enum"`);
  }
}
