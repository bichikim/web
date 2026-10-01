/** @vitest-environment node */

import {describe, expect, it} from 'vitest'

import {resolveAudioSource} from 'src/components/p-studio/resolve-audio-source'

const TOUR_SOURCE = '/tour/audio/ko/settings-background.mp3'

/**
 * Settings calls setLocale without updating document.documentElement.lang
 * (PDocumentMetadata only syncs lang on mount). Tour playback passes both
 * documentLocale and runtimeLocale into resolveAudioSource, which prefers a
 * stale document lang when it is still ko or en.
 */
describe('tour narration locale after in-app language change', () => {
  it('should play tour audio for the runtime locale when document lang is stale', () => {
    expect(
      resolveAudioSource({
        documentLocale: 'ko',
        runtimeLocale: 'en',
        source: TOUR_SOURCE,
      }),
    ).toBe('/tour/audio/en/settings-background.mp3')
  })
})
