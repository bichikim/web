import {expect, it} from 'vitest'
import {cloudTextUsageSchema} from '../contracts'

const daily = {day: '2026-10-07', resetsAt: '2026-10-07T15:00:00.000Z', used: 10}
it('should accept an explicit unlimited usage contract', () => {
  expect(cloudTextUsageSchema.parse({...daily, limit: null, remaining: null})).toEqual({
    ...daily,
    limit: null,
    remaining: null,
  })
})
it('should reject partially unlimited or negative allowance fields', () => {
  expect(cloudTextUsageSchema.safeParse({...daily, limit: null, remaining: 3}).success).toBe(false)
  expect(cloudTextUsageSchema.safeParse({...daily, limit: 3, remaining: null}).success).toBe(false)
  expect(cloudTextUsageSchema.safeParse({...daily, limit: -1, remaining: 0}).success).toBe(false)
})
