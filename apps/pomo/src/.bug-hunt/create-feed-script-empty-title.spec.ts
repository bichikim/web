/** @vitest-environment jsdom */
import {expect, it} from 'vitest'

import {createFeedScript} from '../features/focus-room-feed/feed-parser'

it('should not prefix blank lines when the title is empty but body content exists', () => {
  expect(createFeedScript('', '<p>본문</p>')).toBe('본문')
})
