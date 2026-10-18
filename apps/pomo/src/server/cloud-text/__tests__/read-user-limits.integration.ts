/** @vitest-environment node */
import {PGlite} from '@electric-sql/pglite'
import {drizzle} from 'drizzle-orm/pglite'
import {readFile} from 'node:fs/promises'
import {afterAll, afterEach, beforeAll, expect, it, vi} from 'vitest'
import {readUserCloudTextLimits} from '../read-user-limits'
import type {Database} from 'src/server/database'
import {prepareProductLimits} from './fixtures/product-limits'

vi.mock('src/server/database', async () => ({
  ...(await vi.importActual('src/server/database/schema/cloud-text')),
  ...(await vi.importActual('src/server/database/schema/commerce')),
}))
const database = new PGlite()
const client = drizzle(database, {casing: 'snake_case'}) as unknown as Pick<Database, 'select'>
const userId = '00000000-0000-4000-8000-000000000001'
const otherId = '00000000-0000-4000-8000-000000000002'
const now = new Date('2026-10-07T14:59:00.000Z')
const before = new Date('2026-10-07T14:00:00.000Z')
const after = new Date('2026-10-07T16:00:00.000Z')
interface ProductGrantOptions {
  readonly configured?: boolean
  readonly endsAt?: Date | null
  readonly limit: number | null
  readonly revokedAt?: Date | null
  readonly startsAt?: Date
  readonly userId?: string
}
const addGrant = async (options: ProductGrantOptions): Promise<void> => {
  const productId = crypto.randomUUID()
  await database.query('insert into commerce_products values ($1)', [productId])
  if (options.configured !== false) {
    await database.query(
      'insert into cloud_text_product_limits (product_id, daily_limit) values ($1, $2)',
      [productId, options.limit],
    )
  }
  await database.query('insert into commerce_entitlement_grants values ($1, $2, $3, $4, $5, $6)', [
    crypto.randomUUID(),
    options.userId ?? userId,
    productId,
    options.startsAt ?? before,
    options.endsAt === undefined ? after : options.endsAt,
    options.revokedAt ?? null,
  ])
}
beforeAll(async () => {
  await database.exec('create table pomo_users (id uuid primary key)')
  await database.exec(
    await readFile(
      new URL('../../../../drizzle/0024_cloud_text_limits.sql', import.meta.url),
      'utf8',
    ),
  )
  await prepareProductLimits(database)
  await database.query('insert into pomo_users values ($1), ($2)', [userId, otherId])
})
afterEach(async () => {
  await database.exec(
    'truncate cloud_text_limits, cloud_text_product_limits, commerce_entitlement_grants, commerce_products cascade',
  )
})
afterAll(async () => {
  await database.close()
})
it('should choose the strongest valid configured product for each account', async () => {
  await addGrant({limit: 10})
  await addGrant({limit: 30})
  await addGrant({endsAt: null, limit: null, userId: otherId})
  const limits = await readUserCloudTextLimits(client, [userId, otherId], now)
  expect(limits.get(userId)).toEqual({limit: 30, override: null})
  expect(limits.get(otherId)).toEqual({limit: null, override: null})
})
it('should exclude expired, revoked, future, and unconfigured grants', async () => {
  await addGrant({endsAt: now, limit: null})
  await addGrant({limit: null, revokedAt: before})
  await addGrant({limit: null, startsAt: after})
  await addGrant({configured: false, limit: null})
  const limits = await readUserCloudTextLimits(client, [userId], now)
  expect(limits.get(userId)).toEqual({limit: 3, override: null})
})
it('should prioritize a blocking override and distinguish unlimited from restoring automatic policy', async () => {
  await addGrant({limit: null})
  await addGrant({limit: 10, userId: otherId})
  await database.query(
    'insert into cloud_text_limits (user_id, daily_limit) values ($1, 0), ($2, null)',
    [userId, otherId],
  )
  const limits = await readUserCloudTextLimits(client, [userId, otherId], now)
  expect(limits.get(userId)).toEqual({limit: 0, override: 0})
  expect(limits.get(otherId)).toEqual({limit: null, override: 'unlimited'})
  await database.query('delete from cloud_text_limits where user_id = $1', [otherId])
  expect((await readUserCloudTextLimits(client, [otherId], now)).get(otherId)).toEqual({
    limit: 10,
    override: null,
  })
})
it('should fall back at the exact entitlement expiration while preserving another active product', async () => {
  await addGrant({endsAt: after, limit: null})
  await addGrant({endsAt: null, limit: 10})
  expect((await readUserCloudTextLimits(client, [userId], now)).get(userId)?.limit).toBeNull()
  expect((await readUserCloudTextLimits(client, [userId], after)).get(userId)?.limit).toBe(10)
})
