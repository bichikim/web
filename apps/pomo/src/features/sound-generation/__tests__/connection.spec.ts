/** @vitest-environment node */
import {describe, expect, it} from 'vitest'
import {createPcmCrossfade, createPcmEdgeBlend, createPcmLevelMatchedBuffer} from '../connection'

const frame = (left: number, right: number) => {
  const buffer = new ArrayBuffer(4)
  const view = new DataView(buffer)
  view.setInt16(0, left, true)
  view.setInt16(2, right, true)
  return buffer
}

const pcm = (...frames: ArrayBuffer[]) => {
  const buffer = new Uint8Array(frames.length * 4)
  frames.forEach((value, index) => buffer.set(new Uint8Array(value), index * 4))
  return buffer.buffer
}

const samples = (buffer: ArrayBuffer) => {
  const view = new DataView(buffer)
  return Array.from({length: buffer.byteLength / 4}, (_, index) => [
    view.getInt16(index * 4, true),
    view.getInt16(index * 4 + 2, true),
  ])
}

describe('createPcmCrossfade', () => {
  it('should preserve the equal-power curve for non-clipping and opposite-sign samples', () => {
    const previous = pcm(...Array.from({length: 5}, () => frame(10000, -5000)))
    const next = pcm(...Array.from({length: 5}, () => frame(-2000, 7000)))

    expect(samples(createPcmCrossfade({next, previous}))).toEqual([
      [10000, -5000],
      [8473, -1941],
      [5657, 1414],
      [1979, 4554],
      [-2000, 7000],
    ])
  })

  it.each([
    [32767, -30000, 32767, -32768],
    [-32768, 30000, -32768, 32767],
  ])(
    'should saturate mixed peaks from left %s and right %s without wrapping',
    (left, right, mixedLeft, mixedRight) => {
      const previous = pcm(frame(left, right), frame(left, right), frame(left, right))
      const next = previous.slice(0)

      const result = createPcmCrossfade({next, previous})

      expect(samples(result)).toEqual([
        [left, right],
        [mixedLeft, mixedRight],
        [left, right],
      ])
      expect(result.byteLength).toBe(previous.byteLength)
      expect(samples(previous)).toEqual(samples(next))
      expect(samples(previous)[1]).toEqual([left, right])
    },
  )

  it('should preserve both full-range channels from the next buffer for a single frame', () => {
    const result = createPcmCrossfade({
      next: frame(32767, -32768),
      previous: frame(-32768, 32767),
    })

    expect(samples(result)).toEqual([[32767, -32768]])
  })

  it.each([
    [new ArrayBuffer(0), new ArrayBuffer(0)],
    [new ArrayBuffer(4), new ArrayBuffer(8)],
    [new ArrayBuffer(2), new ArrayBuffer(2)],
  ])('should reject empty, unequal or unaligned PCM pairs (%s, %s)', (previous, next) => {
    expect(() => createPcmCrossfade({next, previous})).toThrow(
      '연결할 오디오가 같은 길이의 스테레오 PCM16 프레임이어야 합니다.',
    )
  })
})

it('should crossfade stereo PCM frames while preserving channel order', () => {
  const result = createPcmCrossfade({
    next: pcm(frame(3000, -3000), frame(3000, -3000), frame(3000, -3000)),
    previous: pcm(frame(1000, -1000), frame(1000, -1000), frame(1000, -1000)),
  })

  expect(samples(result)).toEqual([
    [1000, -1000],
    [2828, -2828],
    [3000, -3000],
  ])
})

it('should level-match a quieter generated buffer before crossfading', () => {
  const previous = pcm(
    frame(2000, 0),
    frame(0, 2000),
    frame(2000, 0),
    frame(0, 2000),
    frame(2000, 0),
  )
  const generated = pcm(
    frame(0, 1000),
    frame(1000, 0),
    frame(0, 1000),
    frame(1000, 0),
    frame(0, 1000),
  )

  const matched = createPcmLevelMatchedBuffer({
    reference: previous,
    source: generated,
    sourceMatch: generated,
  })
  const result = createPcmCrossfade({next: matched, previous})

  expect(samples(matched)[2]).toEqual([0, 2000])
  expect(samples(result)[2]).toEqual([1414, 1414])
})

it('should cap level matching so a quiet generated source is not over-amplified', () => {
  const matched = createPcmLevelMatchedBuffer({
    reference: pcm(frame(2000, 2000), frame(2000, 2000)),
    source: pcm(frame(500, 500), frame(500, 500)),
    sourceMatch: pcm(frame(500, 500), frame(500, 500)),
  })

  expect(samples(matched)).toEqual([
    [1000, 1000],
    [1000, 1000],
  ])
})

it('should blend an AI patch into an edge using the shared ramp', () => {
  const result = createPcmEdgeBlend({
    direction: 'original-to-generated',
    generated: pcm(frame(0, 0), frame(3000, -3000), frame(3000, -3000), frame(3000, -3000)),
    generatedStartFrame: 1,
    original: pcm(frame(1000, -1000), frame(1000, -1000), frame(1000, -1000)),
    rampFrames: 2,
  })

  expect(samples(result)).toEqual([
    [1000, -1000],
    [2000, -2000],
    [3000, -3000],
  ])
})
