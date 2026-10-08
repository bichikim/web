/** @vitest-environment node */
import {prepareApiAiQueue} from '../../__tests__/fixtures/api-ai-queue'
import {PGlite} from '@electric-sql/pglite'
import {drizzle} from 'drizzle-orm/pglite'
import {readFile} from 'node:fs/promises'
import {afterAll, beforeAll, expect, it, vi} from 'vitest'
import {getDatabase} from 'src/server/database'
import {getCloudTextDay} from '../../day'
import {listAdminCloudTextUsers} from '../list-users'
import {prepareProductLimits} from '../../__tests__/fixtures/product-limits'

vi.mock('src/server/database', async () => ({
  ...(await vi.importActual('src/server/database/schema/cloud-text')),
  ...(await vi.importActual('src/server/database/schema/api-ai')),
  ...(await vi.importActual('src/server/database/schema/commerce')),
  ...(await vi.importActual('src/server/database/schema/users')),
  getDatabase: vi.fn(),
}))
const database = new PGlite()
const client = drizzle(database, {casing: 'snake_case'})
const id = (number: number) => `00000000-0000-4000-8000-${String(number).padStart(12, '0')}`

beforeAll(async () => {
  await database.exec(
    'create table pomo_users (id uuid primary key, ' +
      'created_at timestamptz not null default now(), deleted_at timestamptz); ' +
      'create table pomo_identities (user_id uuid, provider text)',
  )
  await database.exec(
    await readFile(new URL('../../../../../drizzle/0023_cloud_text.sql', import.meta.url), 'utf8'),
  )
  await database.exec(
    await readFile(
      new URL('../../../../../drizzle/0024_cloud_text_limits.sql', import.meta.url),
      'utf8',
    ),
  )
  await Promise.all(
    Array.from({length: 32}, (_, index) =>
      database.query('insert into pomo_users (id) values ($1)', [id(index + 1)]),
    ),
  )
  await database.exec(
    await readFile(
      new URL('../../../../../drizzle/0025_cloud_text_usage_reset.sql', import.meta.url),
      'utf8',
    ),
  )
  await database.query('insert into pomo_users (id, deleted_at) values ($1, now())', [id(99)])
  await database.query('insert into pomo_identities values ($1, $2), ($1, $3)', [
    id(1),
    'neon',
    'toss',
  ])
  await database.query('insert into cloud_text_limits (user_id, daily_limit) values ($1, 5)', [
    id(1),
  ])
  const now = new Date()
  const day = getCloudTextDay(now).day
  await Promise.all(
    ['complete', 'pending', 'failed'].map((status) =>
      database.query(
        'insert into cloud_text_requests (id, user_id, day, expires_at, request_hash, status, result) ' +
          'values ($1, $2, $3, $4, $5, $6, $7)',
        [
          crypto.randomUUID(),
          id(1),
          day,
          new Date(now.getTime() + 60_000).toISOString(),
          'a'.repeat(64),
          status,
          status === 'complete' ? '결과' : null,
        ],
      ),
    ),
  )
  await database.query(
    'insert into cloud_text_requests (id, user_id, day, expires_at, request_hash, status) ' +
      'values ($1, $2, $3, $4, $5, $6)',
    [
      crypto.randomUUID(),
      id(1),
      day,
      new Date(now.getTime() - 60_000).toISOString(),
      'a'.repeat(64),
      'pending',
    ],
  )
  vi.mocked(getDatabase).mockReturnValue(client as unknown as ReturnType<typeof getDatabase>)
  await prepareProductLimits(database)
  await prepareApiAiQueue(database)
})
afterAll(async () => {
  await database.close()
})
it('should show the same allowance and live reservations as the generation API', async () => {
  const page = await listAdminCloudTextUsers({userId: id(1)})
  expect(page.users).toHaveLength(1)
  expect(page.users[0]).toMatchObject({
    dailyLimitOverride: 5,
    id: id(1),
    providers: ['neon', 'toss'],
    usage: {limit: 5, remaining: 3, used: 2},
  })
  expect(page.nextCursor).toBe(null)
})
it('should paginate active users without repeating rows or listing deleted users', async () => {
  const page = await listAdminCloudTextUsers({})
  expect(page.users).toHaveLength(30)
  expect(page.nextCursor).toBe(id(30))
  expect(page.users[1]?.usage).toMatchObject({limit: 3, remaining: 3, used: 0})
  const next = await listAdminCloudTextUsers({cursor: page.nextCursor!})
  expect(next.users.map((user) => user.id)).toEqual([id(31), id(32)])
  expect(next.nextCursor).toBe(null)
})
it('should return an empty list for an unknown or deleted user', async () => {
  expect(await listAdminCloudTextUsers({userId: id(99)})).toEqual({nextCursor: null, users: []})
})
