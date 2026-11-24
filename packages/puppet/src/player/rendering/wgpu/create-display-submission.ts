import type {PlayerGpuPresentation} from '../../rendering-options'

export interface PresentationSurface {
  readonly defaultView: Pick<Window, 'cancelAnimationFrame' | 'requestAnimationFrame'> | null
  readonly timeline: Pick<DocumentTimeline, 'currentTime'>
  readonly visibilityState: DocumentVisibilityState
  addEventListener: (type: 'visibilitychange', listener: () => void) => void
  removeEventListener: (type: 'visibilitychange', listener: () => void) => void
}

interface CompletedImage {
  readonly bitmap: ImageBitmap
}

/** Owns completed images until submission or replacement by a newer image. */
export const createDisplaySubmission = <Image extends CompletedImage>(
  surface: PresentationSurface | undefined,
  submit: (image: Image) => boolean,
  presentation: PlayerGpuPresentation = 'auto',
) => {
  const view = surface?.defaultView
  const duringUpdate = presentation === 'animation-frame'
  let held: Image | undefined
  let displayedAt: number | undefined
  let refresh: number | undefined
  let boundary: MessageChannel | undefined
  let boundaryPosted = false
  let generation = 0
  const takeHeld = () => {
    const image = held
    held = undefined
    return image
  }
  const reset = () => {
    if (refresh !== undefined) {
      view?.cancelAnimationFrame(refresh)
      refresh = undefined
    }
    generation += 1
    boundaryPosted = false
    displayedAt = undefined
    return takeHeld()
  }
  const currentRefresh = () => {
    const time = surface?.timeline?.currentTime
    return typeof time === 'number' ? time : undefined
  }
  const present = (image: Image, time: number | undefined) => {
    const current = generation
    if (submit(image) && current === generation) {
      displayedAt = time
    }
  }
  const submitHeld = () => {
    const image = takeHeld()
    if (image !== undefined) {
      present(image, duringUpdate ? undefined : currentRefresh())
    }
  }
  const commitHeld = ({data}: MessageEvent<number>) => {
    if (data === generation) {
      boundaryPosted = false
      submitHeld()
    }
  }
  function afterRefresh() {
    refresh = undefined
    if (duringUpdate) {
      submitHeld()
      return
    }
    if (held !== undefined) {
      if (boundary === undefined) {
        boundary = new MessageChannel()
        boundary.port1.onmessage = commitHeld
      }
      // The task after the refresh lets the browser publish the first image before its replacement.
      boundaryPosted = true
      boundary.port2.postMessage(generation)
    }
  }
  const onVisibilityChange = () => {
    if (surface?.visibilityState !== 'visible') {
      const image = reset()
      if (image !== undefined) {
        submit(image)
      }
    }
  }
  const cancel = () => reset()?.bitmap.close()
  surface?.addEventListener('visibilitychange', onVisibilityChange)
  return {
    cancel,
    destroy() {
      cancel()
      boundary?.port1.close()
      boundary?.port2.close()
      surface?.removeEventListener('visibilitychange', onVisibilityChange)
    },
    show(image: Image) {
      const time = duringUpdate ? undefined : currentRefresh()
      if (
        !view ||
        surface?.visibilityState !== 'visible' ||
        (!duringUpdate && time === undefined)
      ) {
        cancel()
        submit(image)
      } else if (!duringUpdate && held === undefined && time !== displayedAt) {
        present(image, time)
      } else {
        held?.bitmap.close()
        held = image
        if (refresh === undefined && !boundaryPosted) {
          refresh = view.requestAnimationFrame(afterRefresh)
        }
      }
    },
  }
}
