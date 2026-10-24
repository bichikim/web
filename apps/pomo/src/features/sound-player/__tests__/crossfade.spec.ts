import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {createCrossfadeBuffer, resolveLoopPosition} from '../index'
import {installAudioBuffer} from './buffer'

beforeEach(installAudioBuffer)
afterEach(() => vi.unstubAllGlobals())
it('should blend the tail and head independently in each channel without changing the input', () => {
  const source = new AudioBuffer({length: 8, numberOfChannels: 2, sampleRate: 2})
  source.getChannelData(0).set([1, 2, 3, 4, 5, 6, 7, 8])
  source.getChannelData(1).set([-1, -2, -3, -4, -5, -6, -7, -8])
  const result = createCrossfadeBuffer({buffer: source, overlapSeconds: 2})
  expect([...result.getChannelData(0)]).toEqual([
    1,
    2,
    3,
    4,
    5,
    expect.closeTo(14 / 3),
    expect.closeTo(13 / 3),
    4,
  ])
  expect([...result.getChannelData(1)]).toEqual([
    -1,
    -2,
    -3,
    -4,
    -5,
    expect.closeTo(-14 / 3),
    expect.closeTo(-13 / 3),
    -4,
  ])
  expect([...source.getChannelData(0)]).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
})
it('should default to four seconds and preserve the first playback before the blend', () => {
  const source = new AudioBuffer({length: 20, numberOfChannels: 1, sampleRate: 2})
  source.getChannelData(0).set(Array.from({length: 20}, (_, i) => i))
  const result = createCrossfadeBuffer({buffer: source})
  expect(result.getChannelData(0).slice(0, 12)).toEqual(source.getChannelData(0).slice(0, 12))
  expect(result.getChannelData(0)[19]).toBe(7)
  expect(resolveLoopPosition({duration: 10, loopStart: 4, position: 13})).toBe(7)
  expect(resolveLoopPosition({duration: 10, loopStart: 4, position: 10})).toBe(4)
  expect(resolveLoopPosition({duration: 10, loopStart: 4, position: 9})).toBe(9)
})
it('should reject invalid or excessive crossfade intervals', () => {
  const source = new AudioBuffer({length: 10, sampleRate: 2})
  for (const overlapSeconds of [0, -1, NaN, Infinity, 3, 0.01]) {
    expect(() => createCrossfadeBuffer({buffer: source, overlapSeconds})).toThrow()
  }
})
