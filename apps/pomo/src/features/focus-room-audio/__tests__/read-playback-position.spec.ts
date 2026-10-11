/** @vitest-environment jsdom */

import {expect, it} from 'vitest'
import {readPlaybackPosition} from '..'

it.each([
  [undefined, null],
  [NaN, null],
  [Infinity, null],
  [-Infinity, null],
  [-0, 0],
  [0, 0],
  [-1, 0],
  [-Number.MIN_VALUE, 0],
  [Number.MIN_VALUE, Number.MIN_VALUE],
  [0.1, 0.1],
  [1.9, 1.9],
  [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
  [Number.MAX_VALUE, Number.MAX_VALUE],
])('should return %s as the position %s', (currentTime, expected) => {
  const audio = {currentTime} as HTMLAudioElement
  expect(readPlaybackPosition(audio)).toBe(expected)
})

it('should return null when the audio element is absent', () => {
  expect(readPlaybackPosition(undefined)).toBeNull()
})

it('should read the borrowed element position once without changing it', () => {
  let reads = 0
  const audio = {
    get currentTime() {
      reads += 1
      return reads === 1 ? 1.9 : 8
    },
  } as HTMLAudioElement

  expect(readPlaybackPosition(audio)).toBe(1.9)
  expect(reads).toBe(1)
})

it('should propagate the position getter error', () => {
  const error = new Error('Position unavailable')
  const audio = {
    get currentTime(): number {
      throw error
    },
  } as HTMLAudioElement

  expect(() => readPlaybackPosition(audio)).toThrow(error)
})
