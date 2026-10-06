/** @vitest-environment node */
import {PGlite} from '@electric-sql/pglite'
import {drizzle} from 'drizzle-orm/pglite'
import {readFile} from 'node:fs/promises'
import {afterAll, beforeAll, beforeEach, expect, it, vi} from 'vitest'

const mocks = vi.hoisted(() => ({getDatabase: vi.fn()}))
vi.mock('src/server/database', async () => ({
  ...(await import('src/server/database/schema')),
  getDatabase: mocks.getDatabase,
  withTransactionalDatabase: vi.fn(),
}))

import {
  claimAiJobArtifactDeletion,
  markAiJobArtifactDeleted,
  recordAiJobArtifactDeleteFailure,
} from '../artifacts'

const database = new PGlite()
const userId = '019d0000-0000-7000-8000-000000000001'
const jobId = '019d0000-0000-7000-8000-000000000002'
const artifactId = '019d0000-0000-7000-8000-000000000003'
const objectKey = `ai/jobs/${jobId}/temporary/result.wav`
const archiveKey = `ai/jobs/${jobId}/archive/result.wav`

beforeAll(async () => {
  await database.exec('create table pomo_users (id uuid primary key)')
  const migrations = await Promise.all(
    ['0020_tough_timeslip.sql', '0021_youthful_vapor.sql', '0022_organic_darwin.sql'].map(
      (migration) =>
        readFile(new URL(`../../../../../drizzle/${migration}`, import.meta.url), 'utf8'),
    ),
  )
  // The migration test separately covers transactions; this setup commits statements in order.
  for (const source of migrations) {
    for (const statement of source.split('--> statement-breakpoint')) {
      // oxlint-disable-next-line no-await-in-loop -- Migrations must execute in source order.
      await database.exec(statement)
    }
  }
  await database.query('insert into pomo_users values ($1)', [userId])
  await database.query(
    `insert into ai_jobs (id, capability, idempotency_key, model_id, request, request_hash,
      timeout_at, usage_period_start, user_id)
     values ($1, 'text', 'test', 'model', '{}', 'hash', now(), current_date, $2)`,
    [jobId, userId],
  )
  mocks.getDatabase.mockReturnValue(drizzle(database, {casing: 'snake_case'}))
})

beforeEach(async () => {
  await database.exec('delete from ai_job_artifacts')
})
afterAll(async () => {
  await database.close()
})

const insertArtifact = async (lifecycle: 'temporary' | 'saved' | 'archiving') => {
  await database.query(
    `insert into ai_job_artifacts (id, job_id, user_id, content_type, object_key, retention_class,
      lifecycle, pending_object_key)
     values ($1, $2, $3, 'audio/wav', $4, 'unsaved_result', $5, $6)`,
    [
      artifactId,
      jobId,
      userId,
      objectKey,
      lifecycle,
      lifecycle === 'archiving' ? archiveKey : null,
    ],
  )
}

it.each(['temporary', 'saved', 'archiving'] as const)(
  'should delete a migrated %s artifact through the repository',
  async (lifecycle) => {
    await insertArtifact(lifecycle)
    const pending = await claimAiJobArtifactDeletion(artifactId, {expectedLifecycle: lifecycle})
    expect(pending).toMatchObject({
      lifecycle: 'deletion_pending',
      pendingObjectKey: lifecycle === 'archiving' ? archiveKey : objectKey,
    })
    await expect(
      markAiJobArtifactDeleted(artifactId, {expectedLifecycle: 'deletion_pending'}),
    ).resolves.toMatchObject({lifecycle: 'deleted', pendingObjectKey: null})
  },
)

it.each(['temporary', 'saved'] as const)(
  'should durably retain a failed %s deletion for retry',
  async (lifecycle) => {
    await insertArtifact(lifecycle)
    await expect(
      recordAiJobArtifactDeleteFailure(artifactId, 'R2 unavailable'),
    ).resolves.toMatchObject({
      deleteAttempts: 1,
      lifecycle: 'deletion_pending',
      pendingObjectKey: objectKey,
    })
  },
)
