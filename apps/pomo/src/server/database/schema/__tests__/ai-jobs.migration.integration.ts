/** @vitest-environment node */
import {PGlite} from '@electric-sql/pglite'
import {readFile} from 'node:fs/promises'
import {expect, it} from 'vitest'

it('should upgrade the AI enum and constraint inside a migration transaction', async () => {
  const database = new PGlite()
  try {
    await database.exec('create table pomo_users (id uuid primary key)')
    await database.exec(
      await readFile(
        new URL('../../../../../drizzle/0020_tough_timeslip.sql', import.meta.url),
        'utf8',
      ),
    )
    await database.exec(
      await readFile(
        new URL('../../../../../drizzle/0021_youthful_vapor.sql', import.meta.url),
        'utf8',
      ),
    )
    await database.exec('begin')
    await database.exec(
      await readFile(
        new URL('../../../../../drizzle/0022_organic_darwin.sql', import.meta.url),
        'utf8',
      ),
    )
    await database.exec('commit')
    const result = await database.query(
      'select enum_range(null::ai_artifact_lifecycle)::text as values',
    )
    expect(result.rows).toMatchObject([
      {values: expect.stringContaining('archive_cleanup_pending')},
    ])
  } finally {
    await database.close()
  }
})
