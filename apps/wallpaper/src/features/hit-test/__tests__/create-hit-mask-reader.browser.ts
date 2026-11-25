import {expect, test} from 'vitest'
import {createHitMaskReader} from '../create-hit-mask-reader'
import type {HitMask} from '../types'
import type {FrameAlphaSample} from '@winter-love/puppet/player'
const OPAQUE = 255
const HALF_OPAQUE = 128

test('should preserve opaque pixels and alpha holes through a real bitmap Worker', async () => {
  const canvas = document.createElement('canvas')
  canvas.width = 2
  canvas.height = 2
  const context = canvas.getContext('2d')
  if (context === null) {
    throw new Error('Expected a 2D fixture canvas')
  }
  context.putImageData(
    new ImageData(
      new Uint8ClampedArray([0, 0, 0, OPAQUE, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, HALF_OPAQUE]),
      2,
      2,
    ),
    0,
    0,
  )
  let reader: ReturnType<typeof createHitMaskReader>
  const alpha = Promise.withResolvers<FrameAlphaSample>()
  const sampled = new Promise<HitMask>((resolve, reject) => {
    reader = createHitMaskReader({
      onAlpha: alpha.resolve,
      onError: reject,
      onMask: resolve,
      requestAlpha: () => true,
    })
    if (reader === undefined) {
      reject(new Error('ImageBitmap Worker unavailable'))
      return
    }
    reader.sample(canvas, 2, 2)
  })
  try {
    await expect(sampled).resolves.toEqual({
      height: 2,
      runs: [
        [0, 0, 1],
        [1, 1, 2],
      ],
      width: 2,
    })
    await expect(alpha.promise).resolves.toEqual({
      data: new Uint8Array([OPAQUE, 0, 0, HALF_OPAQUE]),
      height: 2,
      width: 2,
    })
  } finally {
    reader?.destroy()
  }
})

test('should preserve separated opaque regions when sampling a larger Canvas at reduced size', async () => {
  const width = 80
  const height = 40
  const band = 20
  const sampledWidth = 8
  const sampledHeight = 4
  const sampledBand = 2
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (context === null) {
    throw new Error('Expected a 2D fixture canvas')
  }
  context.fillRect(0, 0, band, height)
  context.fillRect(width - band, 0, band, height)
  let reader: ReturnType<typeof createHitMaskReader>
  const sampled = new Promise<HitMask>((resolve, reject) => {
    reader = createHitMaskReader({onError: reject, onMask: resolve})
    if (reader === undefined) {
      reject(new Error('ImageBitmap Worker unavailable'))
      return
    }
    reader.sample(canvas, sampledWidth, sampledHeight)
  })
  try {
    await expect(sampled).resolves.toEqual({
      height: sampledHeight,
      runs: Array.from({length: sampledHeight}, (_, row) => [
        [row, 0, sampledBand],
        [row, sampledWidth - sampledBand, sampledWidth],
      ]).flat(),
      width: sampledWidth,
    })
  } finally {
    reader?.destroy()
  }
})
