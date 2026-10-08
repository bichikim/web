/** @vitest-environment node */
// oxlint-disable no-await-in-loop -- Schema migrations depend on their predecessor.
import {PGlite} from '@electric-sql/pglite'
import {drizzle} from 'drizzle-orm/pglite'
import {eq} from 'drizzle-orm'
import {readFile} from 'node:fs/promises'
import {afterAll, afterEach, beforeAll, expect, it, vi} from 'vitest'
import {apiAiJobs, getDatabase, withTransactionalDatabase} from 'src/server/database'
import {prepareApiAiQueue} from './fixtures/api-ai-queue'
import {prepareProductLimits} from './fixtures/product-limits'
import {completeCloudText, releaseCloudText, reserveCloudText} from '../quota'
import {readCloudTextJob} from '../job-status'

vi.mock('src/server/database', async () => ({
  ...(await vi.importActual('src/server/database/schema')),
  getDatabase: vi.fn(),
  withTransactionalDatabase: vi.fn(),
}))
const database = new PGlite()
const client = drizzle(database, {casing: 'snake_case'})
const userId = '00000000-0000-4000-8000-000000000001'
const requestId = '00000000-0000-4000-8000-000000000002'
const now = new Date()

beforeAll(async () => {
  await database.exec('create table pomo_users (id uuid primary key, deleted_at timestamptz)')
  for (const name of ['0023_cloud_text', '0024_cloud_text_limits', '0025_cloud_text_usage_reset']) {
    await database.exec(
      await readFile(new URL(`../../../../drizzle/${name}.sql`, import.meta.url), 'utf8'),
    )
  }
  await prepareProductLimits(database)
  await prepareApiAiQueue(database)
  await database.query('insert into pomo_users values ($1)', [userId])
  vi.mocked(getDatabase).mockReturnValue(client as unknown as ReturnType<typeof getDatabase>)
  vi.mocked(withTransactionalDatabase).mockImplementation(async (operation) =>
    operation(client as unknown as Parameters<typeof operation>[0]),
  )
})
afterEach(async () => {
  await database.exec('truncate cloud_text_requests, api_ai_jobs cascade')
})
afterAll(async () => {
  await database.close()
})

it.each(['failed', 'cancelled'] as const)(
  'should publish %s only after its allowance refund commits',
  async (status) => {
    await reserveCloudText({
      now,
      queue: {
        input: {
          body: {max_output_tokens: 100},
          generationMilliseconds: 120000,
          id: requestId,
          kind: 'cloud-text',
          ownerId: userId,
          queueExpiresAt: new Date(now.getTime() + 900000),
          requestHash: 'a'.repeat(64),
        },
        limit: 10,
      },
      requestHash: 'a'.repeat(64),
      requestId,
      userId,
    })
    await client
      .update(apiAiJobs)
      .set({completedAt: now, status})
      .where(eq(apiAiJobs.id, requestId))
    expect(await readCloudTextJob(userId, requestId)).toMatchObject({
      kind: 'pending',
      usage: {used: 1},
    })
    await releaseCloudText(userId, requestId)
    expect(await readCloudTextJob(userId, requestId)).toMatchObject({
      kind: status,
      usage: {used: 0},
    })
  },
)

it('should not expose a queued generation belonging to another account', async () => {
  await reserveCloudText({now, requestHash: 'a'.repeat(64), requestId, userId})
  expect(await readCloudTextJob('00000000-0000-4000-8000-000000000003', requestId)).toBeNull()
})
it('should expose the model from the final response after fallback', async () => {
  await reserveCloudText({now, requestHash: 'a'.repeat(64), requestId, userId})
  await client.insert(apiAiJobs).values({
    body: {model: 'primary-model'},
    generationMilliseconds: 120000,
    id: requestId,
    kind: 'cloud-text',
    ownerId: userId,
    queueExpiresAt: new Date(now.getTime() + 900000),
    requestHash: 'a'.repeat(64),
    result: {
      failureCode: null,
      fallback: false,
      metadata: {},
      model: 'actual-fallback-model',
      outputText: '리딩',
      responseId: 'response',
      searchSourceUrls: [],
      status: 'completed',
      tokenCount: 10,
    },
    status: 'succeeded',
  })
  await completeCloudText({now, requestId, text: '리딩', tokenCount: 10, userId})
  expect(await readCloudTextJob(userId, requestId)).toMatchObject({
    kind: 'complete',
    modelId: 'actual-fallback-model',
    text: '리딩',
  })
})
it('should return null model metadata for a completed legacy request without an API job', async () => {
  await reserveCloudText({now, requestHash: 'a'.repeat(64), requestId, userId})
  await completeCloudText({now, requestId, text: '과거 결과', tokenCount: 10, userId})
  expect(await readCloudTextJob(userId, requestId)).toMatchObject({kind: 'complete', modelId: null})
})
