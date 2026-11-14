import {type Accessor, batch, createEffect, createSignal, on, onCleanup} from 'solid-js'

interface UseAudioPlaybackProps {
  readonly element: Accessor<HTMLAudioElement | null>
  readonly source: Accessor<string | null>
}

type PlaybackStatus = 'paused' | 'loading' | 'playing' | 'error'

export const useAudioPlayback = (props: UseAudioPlaybackProps) => {
  const [status, setStatus] = createSignal<PlaybackStatus>('paused')
  const [error, setError] = createSignal<'playback' | null>(null)
  const [time, setTime] = createSignal(0)
  const [duration, setDuration] = createSignal(0)
  let revision = 0
  let disposed = false
  let intended = false
  const pause = () => {
    revision += 1
    intended = false
    props.element()?.pause()
    setStatus('paused')
  }
  const fail = () => {
    intended = false
    batch(() => {
      setStatus('error')
      setError('playback')
    })
  }
  const play = () => {
    const element = props.element()
    if (element === null || props.source() === null || disposed) {
      return
    }
    const request = (revision += 1)
    intended = true
    if (error() !== null) {
      element.load()
    }
    batch(() => {
      setError(null)
      setStatus('loading')
    })
    element.play().catch(() => {
      if (!disposed && request === revision) {
        fail()
      }
    })
  }
  const syncTime = () => {
    const element = props.element()
    if (element !== null) {
      batch(() => {
        setTime(Number.isFinite(element.currentTime) ? element.currentTime : 0)
        setDuration(Number.isFinite(element.duration) ? element.duration : 0)
      })
    }
  }
  const seek = (seconds: number) => {
    const element = props.element()
    if (element !== null && Number.isFinite(seconds) && Number.isFinite(element.duration)) {
      element.currentTime = Math.max(0, Math.min(element.duration, seconds))
      syncTime()
    }
  }
  const currentSource = () => {
    const element = props.element()
    const source = props.source()
    return (
      element !== null &&
      source !== null &&
      element.currentSrc === new URL(source, element.ownerDocument.baseURI).href
    )
  }
  const handlePlaying = () => {
    if (intended && currentSource() && props.element()?.paused === false) {
      setStatus('playing')
    }
  }
  const handlePause = () => {
    if (props.element()?.paused && status() !== 'loading' && status() !== 'error') {
      intended = false
      setStatus('paused')
    }
  }
  const handleWaiting = () => {
    if (intended && currentSource()) {
      setStatus('loading')
    }
  }
  const handleError = () => {
    if (currentSource()) {
      fail()
    }
  }
  createEffect(
    on(props.source, () => {
      const resume = intended
      pause()
      batch(() => {
        setTime(0)
        setDuration(0)
        setError(null)
      })
      if (resume) {
        play()
      }
    }),
  )
  onCleanup(() => {
    disposed = true
    pause()
    const element = props.element()
    element?.removeAttribute('src')
    element?.load()
  })
  return {
    duration,
    error,
    handleError,
    handlePause,
    handlePlaying,
    handleWaiting,
    pause,
    play,
    seek,
    status,
    syncTime,
    time,
    toggle: () => (intended ? pause() : play()),
  }
}
