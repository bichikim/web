import {describe, expect, it} from 'vitest'

import {resolveAudioSource} from '../resolve-audio-source'

describe('resolveAudioSource', () => {
  it.each([
    {documentLocale: 'en', expectedLocale: 'ko', runtimeLocale: 'ko'},
    {documentLocale: 'ko', expectedLocale: 'en', runtimeLocale: 'en'},
    {documentLocale: '', expectedLocale: 'en', runtimeLocale: 'en'},
    {documentLocale: '', expectedLocale: 'ko', runtimeLocale: 'ko'},
    {documentLocale: 'ja', expectedLocale: 'ko', runtimeLocale: 'ko'},
    {documentLocale: 'en', expectedLocale: 'en', runtimeLocale: 'ja'},
  ])('should resolve $documentLocale with runtime $runtimeLocale', (copy) => {
    for (const sourceLocale of ['en', 'ko', 'EN', 'KO']) {
      expect(
        resolveAudioSource({
          documentLocale: copy.documentLocale,
          runtimeLocale: copy.runtimeLocale,
          source: `/tour/audio/${sourceLocale}/settings-background.mp3`,
        }),
      ).toBe(`/tour/audio/${copy.expectedLocale}/settings-background.mp3`)
    }
  })

  it.each([
    {
      documentLocale: 'ja',
      expected: '/tour/audio/en/settings-background.mp3',
      runtimeLocale: 'fr',
      source: '/tour/audio/en/settings-background.mp3',
    },
    {
      documentLocale: 'ja',
      expected: '/tour/audio/ko/settings-background.mp3',
      runtimeLocale: 'fr',
      source: '/tour/audio/ja/settings-background.mp3',
    },
  ])('should fall back to a supported audio locale for unsupported locales', (copy) => {
    expect(
      resolveAudioSource({
        documentLocale: copy.documentLocale,
        runtimeLocale: copy.runtimeLocale,
        source: copy.source,
      }),
    ).toBe(copy.expected)
  })

  it.each(['/audio/en/example.mp3', 'https://example.com/tour/audio/en/example.mp3'])(
    'should preserve non-tour source %s',
    (source) => {
      expect(resolveAudioSource({documentLocale: 'ko', runtimeLocale: 'en', source})).toBe(source)
    },
  )
})
