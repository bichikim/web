import {expect, it} from 'vitest'
import {createMouthMotion} from '../create-mouth-motion'

const audio = {
  sampleRate: 100,
  samples: new Float32Array(100),
  shapeCues: [{end: 0.6, shape: 'o' as const, start: 0.2}],
}
it('should close smoothly before a bilabial, fully seal it and release into the next vowel despite a held pose', () => {
  const source = {
    ...audio,
    shapeCues: [
      {end: 0.3, shape: 'a' as const, start: 0.1},
      {end: 0.36, shape: 'closed' as const, start: 0.3},
      {end: 0.65, shape: 'o' as const, start: 0.36},
    ],
  }
  const motion = createMouthMotion()
  const prepare = motion.update({audio: source, clock: 0.285, elapsed: 0.285, fallback: {a: 1}})
  expect(prepare.closure).toBeGreaterThan(0)
  expect(prepare.closure).toBeLessThan(1)
  const closed = motion.update({audio: source, clock: 0.32, elapsed: 0.32, fallback: {a: 1}})
  expect(closed.closure).toBe(1)
  expect(closed.weights).toEqual({closed: 1})
  const release = motion.update({audio: source, clock: 0.38, elapsed: 0.38, fallback: {o: 1}})
  expect(release.closure).toBeGreaterThan(0)
  expect(release.closure).toBeLessThan(1)
  expect(motion.update({audio: source, clock: 0.42, elapsed: 0.42, fallback: {o: 1}}).closure).toBe(
    0,
  )
})
it('should keep a final bilabial sealed through trailing silence without reopening the vowel', () => {
  const source = {
    ...audio,
    shapeCues: [
      {end: 0.5, shape: 'a' as const, start: 0.2},
      {end: 0.58, shape: 'closed' as const, start: 0.5},
    ],
  }
  const motion = createMouthMotion()
  expect(motion.update({audio: source, clock: 0.75, elapsed: 0.75, fallback: {a: 1}}).closure).toBe(
    1,
  )
  motion.reset()
  expect(motion.update({audio, clock: 0.76, elapsed: 0.3, fallback: {o: 1}}).closure).toBe(0)
})
it('should prepare a closed mouth shortly before sound and leave an earlier rest neutral', () => {
  const motion = createMouthMotion()
  expect(motion.update({audio, clock: 0.1, elapsed: 0.1, fallback: {}}).weights).toEqual({})
  const prepared = motion.update({audio, clock: 0.17, elapsed: 0.17, fallback: {}})
  expect(prepared.weights).toEqual({o: 1})
  expect(prepared.motion).toMatchObject({phase: 'prepare'})
  expect(prepared.motion!.weight).toBeGreaterThan(0)
  expect(prepared.motion!.weight).toBeLessThan(0.35)
})
it('should hold a readable pose through a fleeting cue without queueing obsolete vowels', () => {
  const source = {
    ...audio,
    shapeCues: [
      {end: 0.2, shape: 'a' as const, start: 0},
      {end: 0.24, shape: 'i' as const, start: 0.2},
      {end: 0.6, shape: 'o' as const, start: 0.24},
    ],
  }
  const motion = createMouthMotion()
  expect(motion.update({audio: source, clock: 0.17, elapsed: 0.17, fallback: {}}).weights).toEqual({
    i: 1,
  })
  expect(motion.update({audio: source, clock: 0.21, elapsed: 0.21, fallback: {}}).weights).toEqual({
    i: 1,
  })
  expect(motion.update({audio: source, clock: 0.25, elapsed: 0.25, fallback: {}}).weights).toEqual({
    o: 1,
  })
})
it('should hold the final pose then relax continuously before returning to neutral', () => {
  const motion = createMouthMotion()
  motion.update({audio, clock: 0.5, elapsed: 0.5, fallback: {o: 1}})
  expect(motion.update({audio, clock: 0.62, elapsed: 0.62, fallback: {}}).motion).toEqual({
    phase: 'hold',
    weight: 1,
  })
  const released = motion.update({audio, clock: 0.74, elapsed: 0.74, fallback: {}})
  expect(released.motion?.phase).toBe('release')
  expect(released.motion!.weight).toBeGreaterThan(0)
  expect(released.motion!.weight).toBeLessThan(1)
  expect(motion.update({audio, clock: 0.9, elapsed: 0.9, fallback: {}}).weights).toEqual({})
})
it('should finish a clipped last sound with a bounded tail and cancel it on reset', () => {
  const motion = createMouthMotion()
  motion.update({audio, clock: 0.59, elapsed: 0.59, fallback: {o: 1}})
  expect(motion.finish(0.6)).toBe(true)
  expect(motion.relax(0.62)?.motion?.phase).toBe('hold')
  expect(motion.relax(0.74)?.motion?.phase).toBe('release')
  expect(motion.relax(0.9)).toBeNull()
  motion.reset()
  expect(motion.relax(0.62)).toBeNull()
})
it('should keep the same settling duration at a different playback rate', () => {
  const motion = createMouthMotion()
  motion.update({audio, clock: 2.29, elapsed: 0.58, fallback: {o: 1}, speed: 2})
  expect(motion.finish(2.3)).toBe(true)
  expect(motion.relax(2.32)?.motion?.phase).toBe('hold')
  expect(motion.relax(2.44)?.motion?.phase).toBe('release')
  expect(motion.relax(2.54)).toBeNull()
})
it('should retain acoustic-only spans and drop the old tail when another clip starts', () => {
  const motion = createMouthMotion()
  motion.update({audio, clock: 0.59, elapsed: 0.59, fallback: {o: 1}})
  motion.finish(0.6)
  const foreign = {...audio, shapeCues: [{end: 1, shape: null, start: 0}]}
  expect(
    motion.update({audio: foreign, clock: 0.61, elapsed: 0.01, fallback: {i: 1}}).weights,
  ).toEqual({i: 1})
  expect(motion.relax(0.65)).toBeNull()
})
