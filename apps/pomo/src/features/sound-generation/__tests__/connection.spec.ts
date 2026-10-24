/** @vitest-environment node */
import {expect, it} from 'vitest'
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
