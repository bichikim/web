import type {ComputedRenderFrame} from '../../internal/compute-render-frame'
import type {PuppetDocument} from '../../document'
import type {PlayerGpuPresentation} from '../../rendering-options'
import type {DrawGpu} from './types'
import type {GpuClient} from './create-client'
import {createDisplaySubmission, type PresentationSurface} from './create-display-submission'
import {createFramePreparation} from './create-frame-preparation'
export interface Presentation extends DrawGpu {
  readonly document: PuppetDocument
  readonly frame: ComputedRenderFrame
}
interface PresenterOptions {
  /** GPU transport owned by the renderer. */
  readonly client: Pick<GpuClient, 'draw' | 'prefetch'>
  /** Consumes a bitmap or acknowledges a Worker Canvas submission and commits its geometry. */
  readonly show: (bitmap: ImageBitmap | null, presentation: Presentation) => void
  /** Receives the first asynchronous failure. */
  readonly onError: (cause: Error) => void
  /** Document that presents the image. Omit when presentation has no display refresh. */
  readonly surface?: PresentationSurface
  /** Omit or use auto to submit ready bitmaps, coalescing updates in the same display interval. */
  readonly presentation?: PlayerGpuPresentation | undefined
}
interface Submission {
  readonly presentation: Presentation
  readonly sequence: number
}
interface ReadySubmission extends Submission {
  readonly bitmap: ImageBitmap | null
}
interface BitmapSubmission extends ReadySubmission {
  readonly bitmap: ImageBitmap
}
/** Presents completed GPU images and settles display requests through the shown frame. */
export const createGpuPresenter = (options: PresenterOptions) => {
  let queued: Submission | undefined
  const preparation = createFramePreparation()
  let active = false
  let disposed = false
  let generation = 0
  let sequence = 0
  let displayed = 0
  let failure: Error | undefined
  let waiting: Array<{sequence: number; resolve: () => void; reject: (cause: Error) => void}> = []
  const settle = (through: number) => {
    displayed = Math.max(displayed, through)
    const previous = waiting
    waiting = []
    previous.forEach((waiter) => {
      if (waiter.sequence <= displayed) {
        waiter.resolve()
      } else {
        waiting.push(waiter)
      }
    })
  }
  const fail = (cause: unknown) => {
    if (disposed || failure !== undefined) {
      return
    }
    const error = cause instanceof Error ? cause : new Error(String(cause))
    failure = error
    queued = undefined
    preparation.discard()
    display.cancel()
    const previous = waiting
    waiting = []
    previous.forEach((waiter) => waiter.reject(error))
    options.onError(error)
  }
  const show = (image: ReadySubmission) => {
    try {
      options.show(image.bitmap, image.presentation)
      settle(image.sequence)
      return true
    } catch (cause) {
      image.bitmap?.close()
      fail(cause)
      return false
    }
  }
  const display = createDisplaySubmission<BitmapSubmission>(
    options.surface,
    show,
    options.presentation,
  )
  function pump() {
    if (disposed || active || preparation.busy() || queued === undefined || failure !== undefined) {
      return
    }
    const submission = queued
    queued = undefined
    active = true
    const request = generation
    const bitmap = preparation.take(submission.presentation)
    const drawing =
      bitmap === undefined ? options.client.draw(submission.presentation) : Promise.resolve(bitmap)
    drawing
      .then((bitmap) => {
        if (disposed || failure !== undefined || request !== generation) {
          bitmap?.close()
          return
        }
        if (bitmap === null) {
          show({...submission, bitmap})
        } else {
          display.show({...submission, bitmap})
        }
      })
      .catch((cause) => {
        if (request === generation) {
          fail(cause)
        }
      })
      .finally(() => {
        active = false
        pump()
      })
  }
  return {
    cancel() {
      generation += 1
      queued = undefined
      preparation.discard()
      display.cancel()
      settle(sequence)
    },
    destroy() {
      disposed = true
      generation += 1
      queued = undefined
      preparation.discard()
      display.destroy()
      settle(sequence)
    },
    discardPreparation: preparation.discard,
    async flush(): Promise<void> {
      if (failure instanceof Error) {
        throw new Error(failure.message, {cause: failure})
      }
      if (disposed || displayed >= sequence) {
        return
      }
      return new Promise((resolve, reject) => {
        waiting.push({reject, resolve, sequence})
      })
    },
    prepare(create: () => Presentation) {
      if (
        disposed ||
        active ||
        failure !== undefined ||
        queued !== undefined ||
        preparation.occupied() ||
        options.client.prefetch === undefined
      ) {
        return
      }
      const presentation = create()
      const drawing = options.client.prefetch(presentation)
      if (drawing === undefined) {
        return
      }
      preparation.start(presentation, drawing, pump)
    },
    queue(presentation: Presentation) {
      if (!disposed && failure === undefined) {
        sequence += 1
        queued = {presentation, sequence}
        pump()
      }
    },
  }
}
