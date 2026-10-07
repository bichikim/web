/** @vitest-environment node */
import {PGlite} from '@electric-sql/pglite'
import {drizzle} from 'drizzle-orm/pglite'
import {readFile} from 'node:fs/promises'
import {afterAll, afterEach, beforeAll, expect, it, vi} from 'vitest'
import {getDatabase, withTransactionalDatabase} from 'src/server/database'
import {completeCloudText, readCloudTextUsage, reserveCloudText} from '../../quota'
import {resetUserCloudTextUsage} from '../reset-usage'
import {prepareProductLimits} from '../../__tests__/fixtures/product-limits'

vi.mock('src/server/database', async () => ({
  ...(await vi.importActual('src/server/database/schema/cloud-text')),
  ...(await vi.importActual('src/server/database/schema/commerce')),
  ...(await vi.importActual('src/server/database/schema/users')),
  getDatabase: vi.fn(),
  withTransactionalDatabase: vi.fn(),
}))
const database = new PGlite()
const client = drizzle(database, {casing: 'snake_case'})
const userId = '00000000-0000-4000-8000-000000000001'
const otherId = '00000000-0000-4000-8000-000000000002'
const deletedId = '00000000-0000-4000-8000-000000000003'
const now = new Date('2026-10-07T14:59:00.000Z')
const reserve = (account = userId, at = now) => {
  const requestId = crypto.randomUUID()
  return reserveCloudText({now: at, requestHash: 'a'.repeat(64), requestId, userId: account}).then(
    () => requestId,
  )
}
beforeAll(async () => {
  await database.exec('create table pomo_users (id uuid primary key, deleted_at timestamptz)')
  const migrations = await Promise.all(
    ['0023_cloud_text.sql', '0024_cloud_text_limits.sql', '0025_cloud_text_usage_reset.sql'].map(
      (file) => readFile(new URL(`../../../../../drizzle/${file}`, import.meta.url), 'utf8'),
    ),
  )
  await database.exec(migrations.join('\n'))
  await database.query('insert into pomo_users values ($1, null), ($2, null), ($3, now())', [
    userId,
    otherId,
    deletedId,
  ])
  vi.mocked(getDatabase).mockReturnValue(client as unknown as ReturnType<typeof getDatabase>)
  await prepareProductLimits(database)
  vi.mocked(withTransactionalDatabase).mockImplementation(async (operation) =>
    operation(client as unknown as Parameters<typeof operation>[0]),
  )
})
afterEach(async () => {
  await database.exec('truncate cloud_text_requests, cloud_text_limits')
})
afterAll(async () => {
  await database.close()
})
it('should reset only the selected user today and preserve their limit and previous day', async () => {
  const yesterday = new Date('2026-10-06T14:59:00.000Z')
  const previousId = await reserve(userId, yesterday)
  await completeCloudText({
    now: yesterday,
    requestId: previousId,
    text: '어제 결과',
    tokenCount: 10,
    userId,
  })
  await reserve()
  await reserve(otherId)
  await database.query('insert into cloud_text_limits (user_id, daily_limit) values ($1, 5)', [
    userId,
  ])
  expect(await resetUserCloudTextUsage({now, userId})).toBe(true)
  expect(await readCloudTextUsage(userId, now)).toMatchObject({limit: 5, remaining: 5, used: 0})
  expect(await readCloudTextUsage(userId, yesterday)).toMatchObject({used: 1})
  expect(await readCloudTextUsage(otherId, now)).toMatchObject({used: 1})
})
it('should preserve replay and pending completion without recharging after repeated resets', async () => {
  const completedId = await reserve()
  await completeCloudText({now, requestId: completedId, text: '완료', tokenCount: 10, userId})
  const pendingId = await reserve()
  await resetUserCloudTextUsage({now, userId})
  await resetUserCloudTextUsage({now, userId})
  await completeCloudText({now, requestId: pendingId, text: '늦은 결과', tokenCount: 10, userId})
  expect(
    await reserveCloudText({now, requestHash: 'a'.repeat(64), requestId: completedId, userId}),
  ).toMatchObject({kind: 'existing', text: '완료', usage: {used: 0}})
  await reserve()
  expect(await readCloudTextUsage(userId, now)).toMatchObject({remaining: 2, used: 1})
  const records = await database.query('select count(*)::integer as count from cloud_text_requests')
  expect(records.rows).toEqual([{count: 3}])
})
it('should reject missing and deleted accounts without changing another user', async () => {
  await reserve()
  expect(await resetUserCloudTextUsage({now, userId: deletedId})).toBe(false)
  expect(await resetUserCloudTextUsage({now, userId: crypto.randomUUID()})).toBe(false)
  expect(await readCloudTextUsage(userId, now)).toMatchObject({used: 1})
})
