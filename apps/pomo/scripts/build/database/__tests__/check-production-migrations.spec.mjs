/** @vitest-environment node */
import {readFileSync} from 'node:fs'
import {describe, expect, it} from 'vitest'

import {
  findUnsafeProductionMigrationStatements,
  pendingMigrationEntries,
} from '../check-production-migrations.mjs'

describe('pendingMigrationEntries', () => {
  const entries = [
    {tag: '0020_tough_timeslip', when: 100},
    {tag: '0021_youthful_vapor', when: 200},
    {tag: '0022_organic_darwin', when: 300},
  ]

  it('includes only migrations newer than the last applied one', () => {
    expect(pendingMigrationEntries(entries, 200)).toEqual([entries[2]])
  })

  it('includes all migrations for an empty journal', () => {
    expect(pendingMigrationEntries(entries, 0)).toEqual(entries)
  })

  it('selects migration 0022 after 0021 in the project journal', () => {
    const journal = JSON.parse(
      readFileSync(new URL('../../../../drizzle/meta/_journal.json', import.meta.url), 'utf8'),
    )
    const lastAppliedAt = journal.entries.find(({tag}) => tag === '0021_youthful_vapor').when

    expect(pendingMigrationEntries(journal.entries, lastAppliedAt).map(({tag}) => tag)).toEqual([
      '0022_organic_darwin',
    ])
  })
})

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
  ])('should report %s for production review', (_operation, sql) => {
    expect(findUnsafeProductionMigrationStatements(sql)).not.toEqual([])
  })
})
