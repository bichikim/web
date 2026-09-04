import {expect, it} from 'vitest'

import {mapInBatches} from '../batch'

it('should preserve input order while limiting concurrent work', async () => {
  let activeCount = 0
  let maximumActiveCount = 0

  const results = await mapInBatches([1, 2, 3, 4, 5], 2, async (value) => {
    activeCount += 1
    maximumActiveCount = Math.max(maximumActiveCount, activeCount)
    await Promise.resolve()
    activeCount -= 1
    return value * 2
  })

  expect(results).toEqual([2, 4, 6, 8, 10])
  expect(maximumActiveCount).toBe(2)
})
