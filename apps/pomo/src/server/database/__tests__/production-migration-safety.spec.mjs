import {describe, expect, it} from 'vitest'

import {findUnsafeProductionMigrationStatements} from '../../../../scripts/database/check-production-migrations.mjs'

describe('findUnsafeProductionMigrationStatements', () => {
  it('accepts expand-only schema and seed migrations', () => {
    const sql = `
      CREATE TABLE "focus_sessions" ("id" uuid PRIMARY KEY);
      ALTER TABLE "focus_sessions" ADD COLUMN "label" text DEFAULT 'drop later' NOT NULL;
      INSERT INTO "focus_sessions" ("id") VALUES (gen_random_uuid()) ON CONFLICT DO NOTHING;
      INSERT INTO "focus_sessions" ("id") VALUES (gen_random_uuid()) ON CONFLICT DO UPDATE SET "label" = 'focus';
      ALTER TABLE "focus_sessions" ADD CONSTRAINT "owner_fk"
        FOREIGN KEY ("id") REFERENCES "users"("id")
        ON DELETE cascade ON UPDATE no action;
      -- A future contract migration may drop the legacy column.
    `

    expect(findUnsafeProductionMigrationStatements(sql)).toEqual([])
  })

  it.each([
    ['DROP', 'ALTER TABLE "focus_sessions" DROP COLUMN "label";'],
    ['RENAME', 'ALTER TABLE "focus_sessions" RENAME COLUMN "label" TO "title";'],
    ['ALTER COLUMN', 'ALTER TABLE "focus_sessions" ALTER COLUMN "label" TYPE varchar(255);'],
    ['SET NOT NULL', 'ALTER TABLE "focus_sessions" ALTER COLUMN "label" SET NOT NULL;'],
    ['TRUNCATE', 'TRUNCATE TABLE "focus_sessions";'],
    ['DELETE', 'DELETE FROM "focus_sessions";'],
    ['UPDATE', 'UPDATE "focus_sessions" SET "label" = null;'],
    [
      'CTE UPDATE',
      'WITH "expired" AS (SELECT "id" FROM "focus_sessions") UPDATE "focus_sessions" SET "label" = null;',
    ],
  ])('rejects %s contract or data migrations', (_operation, sql) => {
    expect(findUnsafeProductionMigrationStatements(sql)).not.toEqual([])
  })
})
