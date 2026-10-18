/** @vitest-environment node */
import {prepareApiAiQueue} from './fixtures/api-ai-queue'
import {PGlite} from '@electric-sql/pglite'
import {drizzle} from 'drizzle-orm/pglite'
import {readFile} from 'node:fs/promises'
import {afterAll, afterEach, beforeAll, expect, it, vi} from 'vitest'
import {
  cloudTextLimits,
  cloudTextRequests,
  getDatabase,
  pomoUsers,
  withTransactionalDatabase,
} from 'src/server/database'
import {updateUserCloudTextLimit} from '../admin/update-limit'
import {completeCloudText, readCloudTextUsage, releaseCloudText, reserveCloudText} from '../quota'
import {prepareProductLimits} from './fixtures/product-limits'

vi.mock('src/server/database', async () => ({
  ...(await vi.importActual('src/server/database/schema/cloud-text')),
  ...(await vi.importActual('src/server/database/schema/api-ai')),
  ...(await vi.importActual('src/server/database/schema/commerce')),
  ...(await vi.importActual('src/server/database/schema/users')),
  getDatabase: vi.fn(),
  withTransactionalDatabase: vi.fn(),
}))

const userId = '00000000-0000-4000-8000-000000000001'
const otherId = '00000000-0000-4000-8000-000000000002'
const now = new Date('2026-10-07T14:59:00.000Z')
const database = new PGlite()
const client = drizzle(database, {
  casing: 'snake_case',
  schema: {cloudTextLimits, cloudTextRequests, pomoUsers},
})
const reserve = (
  requestId = crypto.randomUUID(),
  requestHash = 'a'.repeat(64),
  at = now,
  account = userId,
) => reserveCloudText({now: at, requestHash, requestId, userId: account})

beforeAll(async () => {
  await database.exec('create table pomo_users (id uuid primary key, deleted_at timestamptz)')
  await database.exec(
    await readFile(new URL('../../../../drizzle/0023_cloud_text.sql', import.meta.url), 'utf8'),
  )
  await database.exec(
    await readFile(
      new URL('../../../../drizzle/0024_cloud_text_limits.sql', import.meta.url),
      'utf8',
    ),
  )
  await database.query('insert into pomo_users values ($1), ($2)', [userId, otherId])
  await database.exec(
    await readFile(
      new URL('../../../../drizzle/0025_cloud_text_usage_reset.sql', import.meta.url),
      'utf8',
    ),
  )
  vi.mocked(getDatabase).mockReturnValue(client as unknown as ReturnType<typeof getDatabase>)
  await prepareProductLimits(database)
  await prepareApiAiQueue(database)
  vi.mocked(withTransactionalDatabase).mockImplementation(async (operation) =>
    operation(client as unknown as Parameters<typeof operation>[0]),
  )
})
afterEach(async () => {
  await database.exec(
    'truncate cloud_text_requests, cloud_text_limits, api_ai_jobs, api_ai_attempts cascade',
  )
})
afterAll(async () => {
  await database.close()
})

it('should reserve exactly three generations across concurrent callers sharing a database', async () => {
  const results = await Promise.all(Array.from({length: 5}, () => reserve()))
  expect(results.filter((result) => result.kind === 'reserved')).toHaveLength(3)
  expect(results.filter((result) => result.kind === 'exhausted')).toHaveLength(2)
  expect(await readCloudTextUsage(userId, now)).toMatchObject({remaining: 0, used: 3})
  expect(await reserve(undefined, undefined, now, otherId)).toMatchObject({
    kind: 'reserved',
    usage: {remaining: 2},
  })
})

it('should replay completed requests without charging and reject changed duplicate input', async () => {
  const requestId = crypto.randomUUID()
  await reserve(requestId)
  expect(await reserve(requestId)).toMatchObject({kind: 'pending', usage: {used: 1}})
  await completeCloudText({now, requestId, text: '리딩 결과', tokenCount: 240, userId})
  expect(await reserve(requestId)).toMatchObject({
    kind: 'existing',
    text: '리딩 결과',
    tokenCount: 240,
    usage: {used: 1},
  })
  expect(await reserve(requestId, 'b'.repeat(64))).toMatchObject({
    kind: 'conflict',
    usage: {used: 1},
  })
  await releaseCloudText(userId, requestId)
  expect(await readCloudTextUsage(userId, now)).toMatchObject({used: 1})
})

it('should release failed generations once and prevent expired generations from consuming reused slots', async () => {
  const requestId = crypto.randomUUID()
  await reserve(requestId)
  await releaseCloudText(userId, requestId)
  await releaseCloudText(userId, requestId)
  expect(await readCloudTextUsage(userId, now)).toMatchObject({remaining: 3, used: 0})
  const pendingId = crypto.randomUUID()
  await reserve(pendingId)
  const expired = new Date('2026-10-07T15:03:00.000Z')
  expect(await reserve(pendingId, undefined, expired)).toMatchObject({kind: 'failed'})
  await expect(
    completeCloudText({
      now: expired,
      requestId: pendingId,
      text: '늦은 결과',
      tokenCount: 20,
      userId,
    }),
  ).rejects.toThrow('expired')
})

it('should give a new allowance at Korea midnight while keeping the previous day charged', async () => {
  const requestId = crypto.randomUUID()
  await reserve(requestId)
  await completeCloudText({now, requestId, text: '완료', tokenCount: 10, userId})
  expect(await readCloudTextUsage(userId, now)).toMatchObject({day: '2026-10-07', remaining: 2})
  const midnight = new Date('2026-10-07T15:00:00.000Z')
  expect(await readCloudTextUsage(userId, midnight)).toMatchObject({
    day: '2026-10-08',
    remaining: 3,
    used: 0,
  })
})

it('should enforce a user override immediately without changing another account', async () => {
  await updateUserCloudTextLimit({dailyLimit: 1, userId})
  expect(await reserve()).toMatchObject({kind: 'reserved', usage: {limit: 1, remaining: 0}})
  expect(await reserve()).toMatchObject({kind: 'exhausted'})
  expect(await readCloudTextUsage(otherId, now)).toMatchObject({limit: 3, remaining: 3})
})

it('should preserve usage when lowering, raising, or restoring a daily limit', async () => {
  const requestId = crypto.randomUUID()
  await reserve(requestId)
  await completeCloudText({now, requestId, text: '완료', tokenCount: 10, userId})
  await updateUserCloudTextLimit({dailyLimit: 0, userId})
  expect(await readCloudTextUsage(userId, now)).toMatchObject({limit: 0, remaining: 0, used: 1})
  expect(await reserve()).toMatchObject({kind: 'exhausted'})
  await updateUserCloudTextLimit({dailyLimit: 5, userId})
  expect(await readCloudTextUsage(userId, now)).toMatchObject({limit: 5, remaining: 4, used: 1})
  await updateUserCloudTextLimit({dailyLimit: null, userId})
  expect(await readCloudTextUsage(userId, now)).toMatchObject({limit: 3, remaining: 2, used: 1})
})
it('should allow unlimited generations while recording usage and retaining it after restoring a limit', async () => {
  await updateUserCloudTextLimit({dailyLimit: 'unlimited', userId})
  const results = await Promise.all(Array.from({length: 5}, () => reserve()))
  expect(results.every((result) => result.kind === 'reserved')).toBe(true)
  expect(await readCloudTextUsage(userId, now)).toMatchObject({
    limit: null,
    remaining: null,
    used: 5,
  })
  await updateUserCloudTextLimit({dailyLimit: null, userId})
  expect(await readCloudTextUsage(userId, now)).toMatchObject({limit: 3, remaining: 0, used: 5})
  expect(await reserve()).toMatchObject({kind: 'exhausted'})
})

it('should roll back quota admission when the durable queue is full', async () => {
  const requestId = crypto.randomUUID()
  const input = {
    body: {max_output_tokens: 100},
    generationMilliseconds: 120000,
    id: requestId,
    kind: 'cloud-text' as const,
    ownerId: userId,
    queueExpiresAt: new Date(now.getTime() + 900000),
    requestHash: 'a'.repeat(64),
  }
  expect(
    await reserveCloudText({
      now,
      queue: {input, limit: 1},
      requestHash: input.requestHash,
      requestId,
      userId,
    }),
  ).toMatchObject({kind: 'reserved'})
  const otherRequestId = crypto.randomUUID()
  expect(
    await reserveCloudText({
      now,
      queue: {input: {...input, id: otherRequestId, ownerId: otherId}, limit: 1},
      requestHash: input.requestHash,
      requestId: otherRequestId,
      userId: otherId,
    }),
  ).toMatchObject({kind: 'queue_full'})
  expect(await readCloudTextUsage(otherId, now)).toMatchObject({used: 0})
})
it('should retain a queued allowance beyond the old synchronous expiration and settle it once', async () => {
  const at = new Date('2026-10-07T12:00:00.000Z')
  const requestId = crypto.randomUUID()
  const input = {
    body: {max_output_tokens: 100},
    generationMilliseconds: 120000,
    id: requestId,
    kind: 'cloud-text' as const,
    ownerId: userId,
    queueExpiresAt: new Date(at.getTime() + 900000),
    requestHash: 'a'.repeat(64),
  }
  await reserveCloudText({
    now: at,
    queue: {input, limit: 10},
    requestHash: input.requestHash,
    requestId,
    userId,
  })
  const late = new Date(at.getTime() + 600000)
  expect(await readCloudTextUsage(userId, late)).toMatchObject({used: 1})
  const completion = {now: late, requestId, text: '완료', tokenCount: 10, userId}
  await completeCloudText(completion)
  await completeCloudText(completion)
  expect(await readCloudTextUsage(userId, late)).toMatchObject({used: 1})
})
