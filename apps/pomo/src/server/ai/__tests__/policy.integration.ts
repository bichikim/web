import {PGlite} from '@electric-sql/pglite'
import {drizzle} from 'drizzle-orm/pglite'
import {pgTable, timestamp} from 'drizzle-orm/pg-core'
import {afterAll, afterEach, assert, beforeAll, expect, it, vi} from 'vitest'

import {getSubscriptionUsagePeriod} from '../policy'

// Match the entitlement timestamp codec without loading unrelated production tables.
const periods = pgTable('subscription_periods', {
  endsAt: timestamp('ends_at', {withTimezone: true}),
  startsAt: timestamp('starts_at', {withTimezone: true}).notNull(),
})
const engine = new PGlite()
const database = drizzle(engine)

beforeAll(async () => {
  await engine.exec(`
    create table subscription_periods (
      starts_at timestamptz not null,
      ends_at timestamptz
    )
  `)
})

afterEach(async () => {
  await engine.exec('truncate subscription_periods')
})

afterAll(async () => {
  await engine.close()
})

it.each([
  {
    endsAt: null,
    expected: {end: '2100-02-28', start: '2100-01-31'},
    name: 'a long-lived database grant',
    now: '2100-01-31T00:00:00.000Z',
    startsAt: '2020-01-31T09:00:00.000Z',
  },
  {
    endsAt: '2026-03-15T09:00:00+09:00',
    expected: {end: '2026-03-15', start: '2026-02-28'},
    name: 'timezone-normalized timestamps and an entitlement cutoff',
    now: '2026-02-28T00:00:00.000Z',
    startsAt: '2026-01-31T09:00:00+09:00',
  },
])('should retain the period and bounded calendar work for $name', async (input) => {
  await engine.query('insert into subscription_periods (starts_at, ends_at) values ($1, $2)', [
    input.startsAt,
    input.endsAt,
  ])
  const [grant] = await database.select().from(periods)
  assert(grant !== undefined)
  const timestamps = [grant.startsAt.getTime(), grant.endsAt?.getTime()]
  const utc = vi.spyOn(Date, 'UTC')
  try {
    expect(getSubscriptionUsagePeriod(grant.startsAt, new Date(input.now), grant.endsAt)).toEqual(
      input.expected,
    )
    expect(utc.mock.calls.length).toBeLessThanOrEqual(6)
    expect([grant.startsAt.getTime(), grant.endsAt?.getTime()]).toEqual(timestamps)
  } finally {
    utc.mockRestore()
  }
})
