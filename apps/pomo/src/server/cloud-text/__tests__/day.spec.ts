import {expect, it} from 'vitest'
import {getCloudTextDay} from '../day'

it('should reset the shared allowance at Korea midnight including year changes', () => {
  expect(getCloudTextDay(new Date('2026-12-31T14:59:59.999Z'))).toEqual({
    day: '2026-12-31',
    resetsAt: '2026-12-31T15:00:00.000Z',
  })
  expect(getCloudTextDay(new Date('2026-12-31T15:00:00.000Z'))).toEqual({
    day: '2027-01-01',
    resetsAt: '2027-01-01T15:00:00.000Z',
  })
})
