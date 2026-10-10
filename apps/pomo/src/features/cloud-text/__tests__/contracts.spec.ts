import {describe, expect, it} from 'vitest'
import {cloudTextRequestSchema, cloudTextResponseSchema, cloudTextUsageSchema} from '../contracts'

const daily = {day: '2026-10-07', resetsAt: '2026-10-07T15:00:00.000Z', used: 10}
it('should preserve the actual model ID and represent missing historical metadata as null', () => {
  const response = {text: '결과', tokenCount: 10, usage: {...daily, limit: null, remaining: null}}
  expect(cloudTextResponseSchema.parse({...response, modelId: 'fallback-model'}).modelId).toBe(
    'fallback-model',
  )
  expect(cloudTextResponseSchema.parse(response).modelId).toBeNull()
})
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

describe('cloudTextRequestSchema', () => {
  it.each([
    {aboveLimit: false, count: 6, repetitions: 8000, unit: 'a'},
    {aboveLimit: true, count: 6, repetitions: 8000, unit: 'a'},
    {aboveLimit: false, count: 64, repetitions: 750, unit: 'a'},
    {aboveLimit: true, count: 64, repetitions: 750, unit: 'a'},
    {aboveLimit: false, count: 6, repetitions: 4000, unit: '😀'},
    {aboveLimit: true, count: 6, repetitions: 4000, unit: '😀'},
  ])(
    'should enforce the total UTF-16 input limit for $count messages of $unit (above: $aboveLimit)',
    ({aboveLimit, count, repetitions, unit}) => {
      const content = unit.repeat(repetitions)
      const request = {
        maximumTokens: 1,
        messages: Array.from({length: count}, (_, index) => ({
          content: content + (aboveLimit && index === 0 ? 'x' : ''),
          role: 'user',
        })),
        requestId: '019d1990-1dc9-7255-a7b5-f9459dfaf781',
      }
      const result = cloudTextRequestSchema.safeParse(request)
      if (aboveLimit) {
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues).toEqual([
            expect.objectContaining({code: 'custom', path: ['messages']}),
          ])
        }
      } else {
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toEqual(request)
        }
      }
    },
  )
})
