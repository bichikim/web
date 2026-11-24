import type {HitMask, HitMaskRequest, HitMaskResponse} from './types'
import type {FrameAlphaSample} from '@winter-love/puppet/player'

export interface CreateHitMaskReaderOptions {
  /** Receives the sampled alpha when it was requested for this frame. */
  readonly onAlpha?: (sample: FrameAlphaSample) => void
  readonly onError: (cause: unknown) => void
  readonly onMask: (mask: HitMask) => void
  /** Requests alpha for a consumer alongside its usual hit mask. */
  readonly requestAlpha?: () => boolean
}
export interface HitMaskReader {
  readonly destroy: () => void
  readonly invalidate: () => void
  readonly sample: (canvas: HTMLCanvasElement, width: number, height: number) => void
}

/** Owns asynchronous alpha sampling; unsupported browsers retain the caller's synchronous path. */
export const createHitMaskReader = (
  options: CreateHitMaskReaderOptions,
): HitMaskReader | undefined => {
  if (
    typeof Worker === 'undefined' ||
    typeof OffscreenCanvas === 'undefined' ||
    typeof createImageBitmap === 'undefined'
  ) {
    return undefined
  }
  let worker: Worker
  try {
    worker = new Worker(new URL('./mask-worker.ts', import.meta.url), {type: 'module'})
  } catch (cause) {
    options.onError(cause)
    return undefined
  }
  let disposed = false
  let sequence = 0
  let generation = 0
  let flight: {readonly generation: number; readonly id: number} | undefined
  const destroy = () => {
    if (!disposed) {
      disposed = true
      worker.terminate()
    }
  }
  const fail = (cause: unknown) => {
    if (!disposed) {
      destroy()
      options.onError(cause)
    }
  }
  worker.onerror = (event) => fail(new Error(event.message || 'Input-region Worker failed'))
  worker.onmessageerror = () => fail(new Error('Input-region response could not be decoded'))
  worker.onmessage = ({data}: MessageEvent<HitMaskResponse>) => {
    if (disposed || flight === undefined || data.id !== flight.id) {
      return
    }
    const request = flight
    flight = undefined
    if (request.generation !== generation) {
      return
    }
    switch (data.kind) {
      case 'error':
        fail(new Error(data.message))
        return
      case 'mask':
        options.onMask(data.mask)
        if (data.alpha !== undefined) {
          options.onAlpha?.(data.alpha)
        }
        return
      default: {
        const exhaustive: never = data
        throw new Error(`Unknown input-region response: ${exhaustive}`)
      }
    }
  }
  return {
    destroy,
    invalidate() {
      generation += 1
    },
    sample(canvas, width, height) {
      if (disposed || flight !== undefined) {
        return
      }
      sequence += 1
      const request = {generation, id: sequence}
      const captureAlpha = options.requestAlpha?.() === true
      flight = request
      let snapshot: Promise<ImageBitmap>
      try {
        snapshot = createImageBitmap(canvas, {
          resizeHeight: height,
          resizeQuality: 'low',
          resizeWidth: width,
        })
      } catch (cause) {
        fail(cause)
        return
      }
      snapshot
        .then((bitmap) => {
          if (disposed || request.generation !== generation) {
            bitmap.close()
            if (flight === request) {
              flight = undefined
            }
            return
          }
          try {
            const message: HitMaskRequest = {
              bitmap,
              ...(captureAlpha ? {captureAlpha: true} : {}),
              height,
              id: request.id,
              width,
            }
            worker.postMessage(message, [bitmap])
          } catch (cause) {
            bitmap.close()
            fail(cause)
          }
        })
        .catch((cause: unknown) => {
          if (flight === request) {
            flight = undefined
          }
          if (request.generation === generation) {
            fail(cause)
          }
        })
    },
  }
}
