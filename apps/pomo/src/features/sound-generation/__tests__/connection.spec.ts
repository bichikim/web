/** @vitest-environment node */
import {expect, it} from 'vitest'
import {createPcmCrossfade, createPcmEdgeBlend} from '../connection'

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
    [2000, -2000],
    [3000, -3000],
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
