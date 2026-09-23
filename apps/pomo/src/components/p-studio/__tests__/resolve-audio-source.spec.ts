import {describe, expect, it} from 'vitest'

import {resolveAudioSource} from '../resolve-audio-source'

describe('resolveAudioSource', () => {
  it.each([
    {documentLocale: 'en', expectedLocale: 'en', runtimeLocale: 'ko'},
    {documentLocale: 'ko', expectedLocale: 'ko', runtimeLocale: 'en'},
    {documentLocale: '', expectedLocale: 'en', runtimeLocale: 'en'},
    {documentLocale: '', expectedLocale: 'ko', runtimeLocale: 'ko'},
    {documentLocale: 'ja', expectedLocale: 'ko', runtimeLocale: 'ko'},
  ])('should resolve $documentLocale with runtime $runtimeLocale', (copy) => {
    for (const sourceLocale of ['en', 'ko']) {
      expect(
        resolveAudioSource({
          documentLocale: copy.documentLocale,
          runtimeLocale: copy.runtimeLocale,
          source: `/tour/audio/${sourceLocale}/settings-background.mp3`,
        }),
      ).toBe(`/tour/audio/${copy.expectedLocale}/settings-background.mp3`)
    }
  })

  it.each(['/audio/en/example.mp3', 'https://example.com/tour/audio/en/example.mp3'])(
    'should preserve non-tour source %s',
    (source) => {
      expect(resolveAudioSource({documentLocale: 'ko', runtimeLocale: 'en', source})).toBe(source)
    },
  )
})
