import {describe, expect, it} from 'vitest'

import {DEV_FEED_QUOTES} from '../quotes'

describe('DEV_FEED_QUOTES', () => {
  it('should contain 50 unique and complete quotes', () => {
    const texts = DEV_FEED_QUOTES.map((quote) => quote.text)

    expect(DEV_FEED_QUOTES).toHaveLength(50)
    expect(new Set(texts).size).toBe(50)
    expect(
      DEV_FEED_QUOTES.every(
        (quote) =>
          quote.source.length > 0 &&
          quote.source === quote.source.trim() &&
          quote.text.length > 0 &&
          quote.text === quote.text.trim(),
      ),
    ).toBe(true)
  })
})
