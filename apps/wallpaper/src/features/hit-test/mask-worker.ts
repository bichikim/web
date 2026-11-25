import {createHitMask} from './create-hit-mask'
import {extractAlpha} from './extract-alpha'
import type {HitMaskRequest, HitMaskResponse} from './types'

const canvas = new OffscreenCanvas(1, 1)
const context = canvas.getContext('2d', {willReadFrequently: true})
self.addEventListener('message', ({data}: MessageEvent<HitMaskRequest>) => {
  const {bitmap, height, id, width} = data
  try {
    if (context === null) {
      throw new Error('Input-region 2D sampling is unavailable')
    }
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
    }
    context.clearRect(0, 0, width, height)
    context.drawImage(bitmap, 0, 0, width, height)
    const image = context.getImageData(0, 0, width, height)
    const alpha = data.captureAlpha === true ? extractAlpha(image) : undefined
    const response: HitMaskResponse = {
      ...(alpha === undefined ? {} : {alpha}),
      id,
      kind: 'mask',
      mask: createHitMask(image),
    }
    self.postMessage(response, {transfer: alpha === undefined ? [] : [alpha.data.buffer]})
  } catch (cause) {
    const response: HitMaskResponse = {
      id,
      kind: 'error',
      message: cause instanceof Error ? cause.message : String(cause),
    }
    self.postMessage(response)
  } finally {
    bitmap.close()
  }
})
