/** @vitest-environment node */
// oxlint-disable no-await-in-loop -- Schema migrations depend on their predecessor.
import {EventEmitter} from 'node:events'
import {PGlite} from '@electric-sql/pglite'
import {drizzle} from 'drizzle-orm/pglite'
import {eq} from 'drizzle-orm'
import {readFile} from 'node:fs/promises'
import {afterAll, afterEach, beforeAll, expect, it, vi} from 'vitest'
import {apiAiJobs, getDatabase, withTransactionalDatabase} from 'src/server/database'
import {prepareApiAiQueue} from './fixtures/api-ai-queue'
import {prepareProductLimits} from './fixtures/product-limits'
import {completeCloudText, releaseCloudText, reserveCloudText} from '../quota'
import {streamCloudTextJob} from '../job-events'
import {readCloudTextEvents} from 'src/features/cloud-text/job-events'

const connection = vi.hoisted(() => ({connect: vi.fn(), end: vi.fn().mockResolvedValue(undefined)}))
vi.mock('@neondatabase/serverless', () => ({
  Pool: class {
    connect = connection.connect
    end = connection.end
  },
}))
vi.mock('src/env', () => ({env: {DATABASE_URL_UNPOOLED: 'postgresql://example/db'}}))
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
afterAll(async () => {
  await database.close()
})
afterEach(async () => {
  await database.exec('truncate cloud_text_requests, api_ai_jobs cascade')
  vi.clearAllMocks()
})
it('should notify a committed result and close its session', async () => {
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
  const ready = Promise.withResolvers<void>()
  const emitter = new EventEmitter()
  const unsubscribe = vi.fn()
  const release = vi.fn(() => {
    unsubscribe()
  })
  const query = vi.fn(async (sql: string) => {
    const channel = sql.slice('LISTEN "'.length, -1)
    const stop = await database.listen(channel, (payload) => {
      emitter.emit('notification', {channel, payload})
    })
    unsubscribe.mockImplementation(stop)
    ready.resolve()
    return {}
  })
  connection.connect.mockResolvedValue(Object.assign(emitter, {query, release}))
  const response = streamCloudTextJob(userId, requestId, new AbortController().signal, [
    'session=refreshed',
  ])
  expect(response.headers.get('cache-control')).toBe('no-store')
  expect(response.headers.getSetCookie()).toEqual(['session=refreshed'])
  if (response.body === null) {
    throw new Error('Expected stream')
  }
  const completion = readCloudTextEvents(response.body, new AbortController().signal)
  // The listener is registered before the initial read, so completing here exercises that race.
  await ready.promise
  await completeCloudText({now, requestId, text: '타로 결과', tokenCount: 10, userId})
  expect(await completion).toMatchObject({
    kind: 'complete',
    response: {text: '타로 결과', tokenCount: 10, usage: {used: 1}},
  })
  expect(release).toHaveBeenCalledExactlyOnceWith(true)
  expect(connection.end).toHaveBeenCalledOnce()
})

it('should keep receiving notifications until the failed generation allowance is refunded', async () => {
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
  const emitter = new EventEmitter()
  const unsubscribe = vi.fn()
  const release = vi.fn(() => unsubscribe())
  const query = vi.fn(async (statement: string) => {
    const channel = statement.slice('LISTEN "'.length, -1)
    const stop = await database.listen(channel, (payload) =>
      emitter.emit('notification', {channel, payload}),
    )
    unsubscribe.mockImplementation(stop)
    return {}
  })
  connection.connect.mockResolvedValue(Object.assign(emitter, {query, release}))
  const response = streamCloudTextJob(userId, requestId, new AbortController().signal, [])
  if (response.body === null) {
    throw new Error('Expected stream')
  }
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  expect(JSON.parse(decoder.decode((await reader.read()).value))).toMatchObject({
    kind: 'pending',
    usage: {used: 1},
  })
  await client
    .update(apiAiJobs)
    .set({completedAt: now, status: 'failed'})
    .where(eq(apiAiJobs.id, requestId))
  expect(JSON.parse(decoder.decode((await reader.read()).value))).toMatchObject({
    kind: 'pending',
    usage: {used: 1},
  })
  await releaseCloudText(userId, requestId)
  expect(JSON.parse(decoder.decode((await reader.read()).value))).toMatchObject({
    kind: 'failed',
    usage: {used: 0},
  })
  expect((await reader.read()).done).toBe(true)
  expect(release).toHaveBeenCalledExactlyOnceWith(true)
  expect(connection.end).toHaveBeenCalledOnce()
  reader.releaseLock()
})
