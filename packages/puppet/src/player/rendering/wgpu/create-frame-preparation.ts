import type {ComputedRenderFrame} from '../../internal/compute-render-frame'
import type {Presentation} from './create-presenter'

interface Preparation {
  readonly presentation: Presentation
  bitmap: ImageBitmap | undefined
  completion: Promise<void> | undefined
  discarded: boolean
}

const matchesPresentation = (left: Presentation, right: Presentation) =>
  left.frame === right.frame &&
  left.width === right.width &&
  left.height === right.height &&
  left.view.every((value, index) => value === right.view[index])

/** Owns one successor image until it is selected for presentation or discarded. */
export const createFramePreparation = () => {
  let preparation: Preparation | undefined
  return {
    busy: () => preparation?.completion !== undefined,
    discard(frame?: ComputedRenderFrame) {
      const pending = preparation
      if (pending === undefined || (frame !== undefined && pending.presentation.frame !== frame)) {
        return undefined
      }
      pending.discarded = true
      pending.bitmap?.close()
      pending.bitmap = undefined
      if (pending.completion === undefined) {
        preparation = undefined
      }
      return pending.completion
    },
    occupied: () => preparation !== undefined,
    start(presentation: Presentation, drawing: Promise<ImageBitmap | null>, onSettled: () => void) {
      const pending: Preparation = {
        bitmap: undefined,
        completion: undefined,
        discarded: false,
        presentation,
      }
      preparation = pending
      pending.completion = drawing
        .then(
          (bitmap) => {
            if (bitmap === null) {
              pending.discarded = true
            } else if (pending.discarded) {
              bitmap.close()
            } else {
              pending.bitmap = bitmap
            }
          },
          () => {
            // An image selected for display can retry through the normal draw path.
            pending.discarded = true
          },
        )
        .finally(() => {
          if (pending.discarded) {
            preparation = undefined
          }
          pending.completion = undefined
          onSettled()
        })
    },
    take(presentation: Presentation) {
      const cached = preparation
      preparation = undefined
      if (cached !== undefined) {
        if (matchesPresentation(cached.presentation, presentation)) {
          return cached.bitmap
        }
        cached.bitmap?.close()
      }
      return undefined
    },
  }
}
