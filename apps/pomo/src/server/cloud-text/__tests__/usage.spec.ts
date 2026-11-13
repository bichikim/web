import {PgDialect} from 'drizzle-orm/pg-core'
import {assert, expect, it} from 'vitest'
import {createCloudTextUsage, getCloudTextUsageCondition} from '../usage'

it('should count charged cancellations and live reservations within the Korea day', () => {
  const now = new Date('2026-12-31T15:00:00.000Z')
  const condition = getCloudTextUsageCondition(now)

  assert(condition !== undefined)
  expect(new PgDialect({casing: 'snake_case'}).sqlToQuery(condition)).toMatchObject({
    params: ['2027-01-01', 'complete', 'cancelled', 'pending', now.toISOString()],
    sql:
      '("cloud_text_requests"."day" = $1 and "cloud_text_requests"."usage_reset_at" is null and ' +
      '("cloud_text_requests"."status" in ($2, $3) or ("cloud_text_requests"."status" = $4 and ' +
      '("cloud_text_requests"."expires_at" > $5 or "cloud_text_requests"."queue_job_id" is not null))))',
  })
})

it.each([
  {limit: undefined, remaining: 1, used: 2},
  {limit: 1, remaining: 0, used: 2},
  {limit: null, remaining: null, used: 2},
])('should report remaining $remaining for limit $limit', ({limit, remaining, used}) => {
  expect(createCloudTextUsage(used, new Date('2026-12-31T15:00:00.000Z'), limit)).toEqual({
    day: '2027-01-01',
    limit: limit === undefined ? 3 : limit,
    remaining,
    resetsAt: '2027-01-01T15:00:00.000Z',
    used,
  })
})
