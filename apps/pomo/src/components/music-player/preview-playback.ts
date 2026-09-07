import type {Accessor} from 'solid-js'

export interface CreatePreviewPlaybackOptions {
  readonly isPlaying: Accessor<boolean>
  readonly pausePlayer: () => void
  readonly playPlayer: () => void
}

export interface PreviewPlayback {
  readonly finish: () => void
  readonly preventResume: () => void
  readonly start: (stopPreview: () => void) => void
  readonly stopBeforePlayback: () => void
}

/** Coordinates album previews with the main player without owning either media element. */
export const createPreviewPlayback = (options: CreatePreviewPlaybackOptions): PreviewPlayback => {
  let activeStop: (() => void) | null = null
  let resumeAfterPreview = false

  const reset = () => {
    activeStop = null
    resumeAfterPreview = false
  }

  return {
    finish() {
      if (activeStop === null) {
        return
      }

      activeStop = null
      const shouldResume = resumeAfterPreview
      resumeAfterPreview = false

      if (shouldResume) {
        options.playPlayer()
      }
    },
    preventResume() {
      resumeAfterPreview = false
    },
    start(stopPreview) {
      const previousStop = activeStop

      if (previousStop !== null) {
        reset()
        previousStop()
      }

      resumeAfterPreview = options.isPlaying()
      activeStop = stopPreview
      options.pausePlayer()
    },
    stopBeforePlayback() {
      const stopPreview = activeStop

      if (stopPreview !== null) {
        reset()
        stopPreview()
      }
    },
  }
}
