import {expect, it} from 'vitest'

import {beginFeedSync, createFeedSyncGate, finishFeedSync} from '../sync-gate'

it('should merge active synchronization requests into one follow-up run', () => {
  const gate = createFeedSyncGate()

  expect(beginFeedSync(gate)).toBe(true)
  expect(beginFeedSync(gate)).toBe(false)
  expect(beginFeedSync(gate)).toBe(false)
  expect(finishFeedSync(gate)).toBe(true)
  expect(beginFeedSync(gate)).toBe(true)
  expect(finishFeedSync(gate)).toBe(false)
})
