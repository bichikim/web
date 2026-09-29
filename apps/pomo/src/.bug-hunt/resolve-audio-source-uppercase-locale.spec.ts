/** @vitest-environment node */
import {expect, it} from 'vitest'

import {resolveAudioSource} from '../components/p-studio/resolve-audio-source'

it('should rewrite tour audio paths when the locale segment uses uppercase letters', () => {
  expect(
    resolveAudioSource({
      documentLocale: 'ko',
      runtimeLocale: 'en',
      source: '/tour/audio/EN/settings-background.mp3',
    }),
  ).toBe('/tour/audio/ko/settings-background.mp3')
})
