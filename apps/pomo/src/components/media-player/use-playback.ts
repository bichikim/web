import {type Accessor, createSignal, onCleanup} from 'solid-js'

export interface UsePlaybackProps {
  readonly element: Accessor<HTMLAudioElement | undefined>
  readonly onPlay?: () => void
  readonly onPause?: (wasPlaying: boolean) => void
  readonly onError?: (error: unknown) => void
}

export interface PlaybackEvents {
  readonly onError: (error?: unknown) => void
  readonly onPause: () => void
  readonly onPlay: () => void
}

export interface Playback {
  readonly events: PlaybackEvents
  readonly handleError: (error?: unknown) => void
  readonly invalidate: () => void
  readonly isPlaying: Accessor<boolean>
  readonly pause: () => void
  readonly play: () => void
  readonly seek: (seconds: number) => void
  readonly stop: () => void
}

/** 단일 오디오의 재생 상태와 명령, 오래된 재생 요청의 오류를 관리한다. */
export const usePlayback = (props: UsePlaybackProps): Playback => {
  const [isPlaying, setIsPlaying] = createSignal(false)
  let revision = 0
  let disposed = false
  const invalidate = () => {
    revision += 1
  }
  const handleError = (error?: unknown) => {
    if (disposed || (error instanceof DOMException && error.name === 'AbortError')) {
      return
    }
    setIsPlaying(false)
    props.onError?.(error)
  }
  const play = () => {
    const request = (revision += 1)
    const element = props.element()
    element?.play().catch((error: unknown) => {
      if (request === revision && element === props.element()) {
        handleError(error)
      }
    })
  }
  const pause = () => {
    invalidate()
    props.element()?.pause()
  }
  const handlePlay = () => {
    invalidate()
    setIsPlaying(true)
    props.onPlay?.()
  }
  const handlePause = () => {
    const wasPlaying = isPlaying()
    if (wasPlaying) {
      invalidate()
    }
    setIsPlaying(false)
    props.onPause?.(wasPlaying)
  }
  const stop = () => {
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
    events: {onError: handleError, onPause: handlePause, onPlay: handlePlay},
    handleError,
    invalidate,
    isPlaying,
    pause,
    play,
    seek: (seconds: number) => {
      const element = props.element()
      if (element !== undefined) {
        element.currentTime = seconds
      }
    },
    stop,
  }
}
