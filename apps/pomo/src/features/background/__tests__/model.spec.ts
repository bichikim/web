import {expect, it} from 'vitest'

import {backgroundPreferencesSchema, DEFAULT_BACKGROUND} from '../model'

it('should default the website URL to empty when reading existing background settings', () => {
  const preferences = backgroundPreferencesSchema.parse({
    ...DEFAULT_BACKGROUND,
    websiteUrl: undefined,
  })

  expect(preferences.websiteUrl).toBeNull()
})

it('should accept an HTTPS website background URL', () => {
  const preferences = backgroundPreferencesSchema.parse({
    ...DEFAULT_BACKGROUND,
    mode: 'website',
    websiteUrl: 'https://example.com/dashboard',
  })

  expect(preferences).toMatchObject({
    mode: 'website',
    websiteUrl: 'https://example.com/dashboard',
  })
})

it.each(['http://example.com', 'example.com', ['java', 'script:alert(1)'].join('')])(
  'should reject a non-HTTPS website background URL: %s',
  (websiteUrl) => {
    expect(() =>
      backgroundPreferencesSchema.parse({
        ...DEFAULT_BACKGROUND,
        mode: 'website',
        websiteUrl,
      }),
    ).toThrow()
  },
)
