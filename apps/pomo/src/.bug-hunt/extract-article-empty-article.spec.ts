/** @vitest-environment jsdom */
import {expect, it} from 'vitest'

import {extractArticleText} from '../features/focus-room-feed/feed-parser'

it('should read main content when article element is present but empty', () => {
  const html = '<article></article><main><p>본문</p></main>'

  expect(extractArticleText(html)).toBe('본문')
})
