import {describe, expect, test} from 'vitest'

import {PUPPET_VOWELS, type PuppetMotion, type PuppetVowel} from '../../document'
import type {MotionFrame} from '../../playback/types'
import {synthesizeVowel} from '../../voice/__tests__/support/synthesize-vowel'
import {decodeWav, type PuppetSound} from '../decode-wav'
import {getMotionSoundMouth, getMotionSoundWindow, MOTION_SOUND_WINDOW} from '../motion-sound-mouth'
import {encodeWav} from './support/encode-wav'

const RATE = 16_000
const SECOND = RATE

/** One second of "a" then one second of silence, as 16-bit PCM. */
const createSound = (): PuppetSound => {
  const vowel = synthesizeVowel([780, 1220], {length: SECOND, rate: RATE})
  const result = decodeWav(
    encodeWav({channels: [[...vowel, ...new Float64Array(SECOND)]], sampleRate: RATE}),
  )
  if (!result.ok) {
    throw new Error(result.error)
  }
  return result.sound
}

const motion: PuppetMotion = {duration: 3, id: 'talk', sound: {src: 'talk.wav'}, tracks: []}
const frame = (time: number, weight = 1): MotionFrame => ({
  blend: 'replace',
  motion,
  priority: 0,
  time,
  weight,
})

const strongest = (weights: Readonly<Record<PuppetVowel, number>>) =>
  PUPPET_VOWELS.reduce((best, vowel) => (weights[vowel] > weights[best] ? vowel : best))

describe('getMotionSoundMouth', () => {
  const sound = createSound()
  const getSound = (src: string) => (src === 'talk.wav' ? sound : undefined)

  test('should measure imported audio as per-channel RMS over the current frame, without motion fading', () => {
    const samples = Float32Array.from({length: 160}, (_, index) => (index < 80 ? 0.25 : 0.75))
    const stereo: PuppetSound = {
      channels: [samples, samples.map((value) => -value)],
      mono: new Float32Array(160),
      sampleRate: 8000,
    }
    const rms = {
      ...frame(0.02, 0.1),
      motion: {...motion, sound: {analysis: 'rms' as const, src: 'talk.wav'}},
    }
    expect(getMotionSoundMouth([rms], () => stereo, 0.01)?.level).toBeCloseTo(0.75)
    expect(
      getMotionSoundMouth(
        [
          {
            ...rms,
            motion: {...rms.motion, sound: {...rms.motion.sound, volume: 'motion' as const}},
          },
        ],
        () => stereo,
        0.01,
      ),
    ).toEqual(getMotionSoundMouth([rms], () => stereo, 0.01))
    expect(getMotionSoundMouth([{...rms, time: 0.01}], () => stereo, 0.01)?.level).toBeCloseTo(0.25)
    expect(getMotionSoundMouth([{...rms, time: 0.025}], () => stereo, 0.01)?.level).toBeCloseTo(
      0.75,
    )
    expect(getMotionSoundMouth([{...rms, time: 0.04}], () => stereo, 0.01)).toBeUndefined()
  })

  test('should take the window before the motion time until the sound ends', () => {
    expect(getMotionSoundWindow(sound, 0.5)).toHaveLength(MOTION_SOUND_WINDOW * RATE)
    // Shorter at the start, then nothing once the sound has ended.
    expect(getMotionSoundWindow(sound, 0.01)).toHaveLength(0.01 * RATE)
    expect(getMotionSoundWindow(sound, 2)).toBeUndefined()
    expect(getMotionSoundWindow(sound, Number.NaN)).toBeUndefined()
  })

  test('should analyze the sound at each frame time, weighted by the frame', () => {
    const talking = getMotionSoundMouth([frame(0.5)], getSound)
    expect(talking?.level).toBe(1)
    const explicit = {
      ...frame(0.5),
      motion: {
        ...motion,
        sound: {analysis: 'voice' as const, src: 'talk.wav', volume: 'source' as const},
      },
    }
    expect(getMotionSoundMouth([explicit], getSound)).toEqual(talking)
    expect(strongest(talking!.weights)).toBe('a')
    const half = getMotionSoundMouth([frame(0.5, 0.5)], getSound)
    expect(half?.level).toBe(0.5)
    expect(half?.weights.a).toBeCloseTo(talking!.weights.a / 2, 12)
    // Silent but still lasting: the sound keeps the mouth closed.
    expect(getMotionSoundMouth([frame(1.5)], getSound)).toEqual({
      level: 0,
      weights: {a: 0, e: 0, i: 0, o: 0, u: 0},
    })
    expect(getMotionSoundMouth([frame(2.5)], getSound)).toBeUndefined()
    // Not loaded yet, or no sound at all.
    expect(getMotionSoundMouth([frame(0.5)], () => undefined)).toBeUndefined()
    expect(
      getMotionSoundMouth([{...frame(0.5), motion: {...motion, sound: undefined}}], getSound),
    ).toBeUndefined()
  })
})
