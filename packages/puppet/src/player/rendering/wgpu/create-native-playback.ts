import type {NativePlayerSurface, NativePlayerTarget} from '../../native-backend'
import type {PlayerAlphaCapture} from '../../rendering-options'

interface NativePlaybackOptions {
  readonly surface: NativePlayerSurface
  readonly capture: PlayerAlphaCapture | undefined
  readonly revision: () => number | undefined
  readonly waitForRedraw: () => Promise<unknown>
  readonly viewport: () => NativePlayerTarget
  readonly beforeRender: (() => void) | undefined
}

/** Coordinates a complete native frame and keeps optional alpha feedback outside its completion. */
export const createNativePlayback = ({
  beforeRender,
  capture,
  revision,
  surface,
  viewport,
  waitForRedraw,
}: NativePlaybackOptions) => {
  let drawingDuringPlayback = false
  let readingAlpha = false
  const requestAlpha = () => (readingAlpha ? undefined : capture?.requestSize())
  const alphaSample = (
    size: NonNullable<NativePlayerTarget['alpha']>,
    data: Uint8Array<ArrayBuffer>,
  ) => {
    if (data.length === size.width * size.height) {
      capture?.onSample({...size, data})
    } else {
      capture?.onError(new Error('Native alpha sample is unavailable'))
    }
  }
  const nativePlayback: NativePlayerSurface['playback'] = async (message) => {
    if (message.kind !== 'produce') {
      return surface.playback(message)
    }
    const request = revision()
    drawingDuringPlayback = true
    try {
      await waitForRedraw()
      if (request === undefined || request !== revision()) {
        return {
          frame: {
            buffer: message.request.buffer,
            generation: message.request.generation,
            kind: 'stale',
          },
          id: message.id,
          kind: 'produced',
        }
      }
      const alpha = requestAlpha()
      const target = {
        ...viewport(),
        ...(alpha === undefined ? {} : {alpha}),
      }
      beforeRender?.()
      const result = await surface.playback(message, target)
      if (result.kind !== 'produced' || result.frame.kind !== 'frame') {
        return result
      }
      return {
        ...result,
        frame: {...result.frame, computed: {...result.frame.computed, nativeTarget: target}},
      }
    } finally {
      drawingDuringPlayback = false
    }
  }
  const readAlpha = (alpha: NonNullable<NativePlayerTarget['alpha']>) => {
    const request = revision()
    const current = () => request !== undefined && revision() === request
    readingAlpha = true
    surface
      .readAlpha()
      .then((data) => {
        if (current()) {
          alphaSample(alpha, data)
        }
      })
      .catch((cause: unknown) => {
        if (current()) {
          capture?.onError(new Error('Native alpha sample is unavailable', {cause}))
        }
      })
      .finally(() => {
        readingAlpha = false
      })
  }
  return {
    alphaSample,
    drawing: () => drawingDuringPlayback,
    nativePlayback,
    readAlpha,
    requestAlpha,
  }
}
