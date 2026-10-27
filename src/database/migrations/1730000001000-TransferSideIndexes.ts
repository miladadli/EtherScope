import { MigrationInterface, QueryRunner } from 'typeorm';

export class TransferSideIndexes1730000001000 implements MigrationInterface {
  name = 'TransferSideIndexes1730000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX "idx_transfers_from_status_block"
      ON "transfers" ("from_address", "status", "block_number" DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_transfers_to_status_block"
      ON "transfers" ("to_address", "status", "block_number" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_transfers_to_status_block"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_transfers_from_status_block"`);
  }
}
