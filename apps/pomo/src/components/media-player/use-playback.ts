import {type Accessor, createSignal, onCleanup} from 'solid-js'
import {isAbortError as hasAbortErrorName} from 'src/utils/is-cancellation-reason'

export interface UsePlaybackProps {
  readonly element: Accessor<HTMLAudioElement | undefined>
  readonly shouldIgnoreNativePause?: () => boolean
  readonly onPlay?: () => void
  readonly onPauseRequest?: (isUserIntent: boolean) => void
  readonly onPause?: (wasPlaying: boolean, isUserIntent: boolean) => void
  readonly onError?: (error: unknown) => void
}

export interface PlaybackPauseOptions {
  readonly isUserIntent?: boolean
}

export interface Playback {
  readonly cancelPendingPlay: () => void
  readonly invalidate: () => void
  readonly isPlaying: Accessor<boolean>
  readonly markPauseIntent: () => void
  readonly onError: (error?: unknown) => void
  readonly onPause: () => void
  readonly onPlay: () => void
  readonly pause: (options?: PlaybackPauseOptions) => void
  readonly play: () => void
  readonly seek: (seconds: number) => void
  readonly stop: () => void
}

const isMediaError = (error: unknown): error is Pick<MediaError, 'code' | 'message'> =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  'message' in error &&
  typeof error.code === 'number' &&
  typeof error.message === 'string'

const isAbortError = (error: unknown) =>
  (error instanceof DOMException && hasAbortErrorName(error)) ||
  (isMediaError(error) && error.code === 1)

/** 단일 오디오의 재생 상태와 명령, 오래된 재생 요청의 오류를 관리한다. */
export const usePlayback = (props: UsePlaybackProps): Playback => {
  const [isPlaying, setIsPlaying] = createSignal(false)
  let revision = 0
  let disposed = false
  let pauseIntent: boolean | null = null
  let pauseWasPlaying: boolean | null = null
  let pendingPlay = false
  let ignorePendingPlayEvent = false
  const invalidate = () => {
    revision += 1
  }
  const handleError = (error?: unknown) => {
    if (disposed || isAbortError(error)) {
      return
    }
    pendingPlay = false
    ignorePendingPlayEvent = false
    pauseIntent = null
    pauseWasPlaying = null
    setIsPlaying(false)
    props.onError?.(error)
  }
  const cancelPendingPlayRequest = () => {
    if (!pendingPlay) {
      return false
    }

    pendingPlay = false
    ignorePendingPlayEvent = true
    invalidate()
    return true
  }
  const cancelPendingPlay = () => {
    if (cancelPendingPlayRequest()) {
      props.element()?.pause()
    }
  }
  const play = () => {
    const request = (revision += 1)
    pendingPlay = true
    pauseIntent = null
    pauseWasPlaying = null
    const element = props.element()
    element?.play().catch((error: unknown) => {
      if (request === revision && element === props.element()) {
        pendingPlay = false
        handleError(error)
      }
    })
  }
  const requestPause = (isUserIntent: boolean) => {
    if (pauseWasPlaying === null) {
      pauseWasPlaying = isPlaying()
    }
    pauseIntent = isUserIntent
    props.onPauseRequest?.(isUserIntent)
    cancelPendingPlayRequest()
    invalidate()
    setIsPlaying(false)
  }
  const pause = (options: PlaybackPauseOptions = {}) => {
    requestPause(options.isUserIntent ?? true)
    props.element()?.pause()
  }
  const markPauseIntent = () => {
    requestPause(true)
  }
  const handlePlay = () => {
    if (ignorePendingPlayEvent) {
      if (props.element()?.paused !== false) {
        ignorePendingPlayEvent = false
        return
      }
      ignorePendingPlayEvent = false
    }

    pendingPlay = false
    pauseIntent = null
    pauseWasPlaying = null
    invalidate()
    setIsPlaying(true)
    props.onPlay?.()
  }
  const handlePause = () => {
    if (props.shouldIgnoreNativePause?.() && pauseIntent === null) {
      return
    }

    cancelPendingPlayRequest()
    const wasPlaying = pauseWasPlaying ?? isPlaying()
    const isUserIntent = pauseIntent === true
    pauseIntent = null
    pauseWasPlaying = null
    if (wasPlaying) {
      invalidate()
    }
    setIsPlaying(false)
    props.onPause?.(wasPlaying, isUserIntent)
  }
  const stop = () => {
    pauseIntent = null
    pauseWasPlaying = null
    cancelPendingPlayRequest()
    invalidate()
    setIsPlaying(false)
    if (!disposed) {
      props.element()?.pause()
    }
  }
  onCleanup(() => {
    disposed = true
    invalidate()
    props.element()?.pause()
  })
  return {
    cancelPendingPlay,
    invalidate,
    isPlaying,
    markPauseIntent,
    onError: handleError,
    onPause: handlePause,
    onPlay: handlePlay,
    pause,
    play,
    seek: (seconds: number) => {
      pauseIntent = null
      const element = props.element()
      if (element !== undefined) {
        element.currentTime = seconds
      }
    },
    stop,
  }
}
