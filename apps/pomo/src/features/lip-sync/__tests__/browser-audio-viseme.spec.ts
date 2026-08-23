import {describe, expect, it} from 'vitest'

import {createPVisemeDriver} from '../audio-driven-viseme'
import {resolvePBrowserAudioVisemeFrame} from '../browser-audio-viseme'

describe('resolvePBrowserAudioVisemeFrame', () => {
  it.each([
    ['A', 'open'],
    ['E', 'wide'],
    ['I', 'wide'],
    ['O', 'round'],
    ['U', 'round'],
    ['S', 'narrow'],
  ] as const)('should map the %s profile to the %s mouth', (profileName, viseme) => {
    expect(
      resolvePBrowserAudioVisemeFrame({
        fallbackViseme: 'rest',
        intensity: 0.8,
        weights: {[profileName]: 1},
      }),
    ).toEqual({intensity: 0.8, viseme})
  })

  it('should return to rest below the analysis volume threshold', () => {
    expect(
      resolvePBrowserAudioVisemeFrame({
        fallbackViseme: 'wide',
        intensity: 0.05,
        weights: {I: 1},
      }),
    ).toEqual({intensity: 0.05, viseme: 'rest'})
  })

  it('should preserve a text-derived bilabial closure at low volume', () => {
    expect(
      resolvePBrowserAudioVisemeFrame({
        fallbackViseme: 'closed',
        intensity: 0.05,
        weights: {A: 1},
      }),
    ).toEqual({intensity: 0.08, viseme: 'closed'})
  })

  it('should retain the text-guided mouth when no profile has a positive weight', () => {
    expect(
      resolvePBrowserAudioVisemeFrame({
        fallbackViseme: 'open',
        intensity: 0.5,
        weights: {},
      }),
    ).toEqual({intensity: 0.5, viseme: 'open'})
  })

  it('should retain the text-guided mouth when the audio winner is uncertain', () => {
    expect(
      resolvePBrowserAudioVisemeFrame({
        fallbackViseme: 'open',
        intensity: 0.8,
        weights: {A: 0.4, I: 0.6},
      }),
    ).toEqual({intensity: 0.8, viseme: 'open'})
  })

  it('should override the text-guided mouth when the audio winner is decisive', () => {
    expect(
      resolvePBrowserAudioVisemeFrame({
        fallbackViseme: 'open',
        intensity: 0.8,
        weights: {A: 0.1, I: 0.9},
      }),
    ).toEqual({intensity: 0.8, viseme: 'wide'})
  })

  it('should preserve text-derived closure even when the audio winner is loud', () => {
    expect(
      resolvePBrowserAudioVisemeFrame({
        fallbackViseme: 'closed',
        intensity: 0.9,
        weights: {A: 1},
      }),
    ).toEqual({intensity: 0.28, viseme: 'closed'})
  })

  it('should preserve a quiet text-derived closure through the viseme driver', () => {
    const driver = createPVisemeDriver()
    const frame = resolvePBrowserAudioVisemeFrame({
      fallbackViseme: 'closed',
      intensity: 0.05,
      weights: {A: 1},
    })

    expect(driver.update({currentTimeMs: 0, ...frame})).toBe('closed')
  })
})
