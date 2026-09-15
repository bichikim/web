import {type Accessor, createSignal, onCleanup} from 'solid-js'

export interface UsePlaybackProps {
  readonly element: Accessor<HTMLAudioElement | undefined>
  readonly onPlay?: () => void
  readonly onPause?: (wasPlaying: boolean, isUserIntent: boolean) => void
  readonly onError?: (error: unknown) => void
}

export interface PlaybackPauseOptions {
  readonly isUserIntent?: boolean
}

export interface Playback {
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

/** 단일 오디오의 재생 상태와 명령, 오래된 재생 요청의 오류를 관리한다. */
export const usePlayback = (props: UsePlaybackProps): Playback => {
  const [isPlaying, setIsPlaying] = createSignal(false)
  let revision = 0
  let disposed = false
  let pauseIntent: boolean | null = null
  const invalidate = () => {
    revision += 1
  }
  const handleError = (error?: unknown) => {
    if (disposed || (error instanceof DOMException && error.name === 'AbortError')) {
      return
    }
    pauseIntent = null
    setIsPlaying(false)
    props.onError?.(error)
  }
  const play = () => {
    const request = (revision += 1)
    pauseIntent = null
    const element = props.element()
    element?.play().catch((error: unknown) => {
      if (request === revision && element === props.element()) {
        handleError(error)
      }
    })
  }
  const pause = (options: PlaybackPauseOptions = {}) => {
    pauseIntent = options.isUserIntent ?? true
    invalidate()
    props.element()?.pause()
  }
  const markPauseIntent = () => {
    pauseIntent = true
  }
  const handlePlay = () => {
    pauseIntent = null
    invalidate()
    setIsPlaying(true)
    props.onPlay?.()
  }
  const handlePause = () => {
    const wasPlaying = isPlaying()
    const isUserIntent = pauseIntent === true
    pauseIntent = null
    if (wasPlaying) {
      invalidate()
    }
    setIsPlaying(false)
    props.onPause?.(wasPlaying, isUserIntent)
  }
  const stop = () => {
    pauseIntent = null
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
