import {
  createEffect,
  createMemo,
  createSignal,
  type JSX,
  onCleanup,
  type ParentProps,
  untrack,
} from 'solid-js'

import {
  AudioPlayerContext,
  type AudioPlayerContextValue,
  type AudioPlayerMediaBindings,
} from './context'

export interface AudioPlayerRootProps extends ParentProps {
  readonly autoplay?: boolean
  readonly onPlayError?: (error: unknown) => void
  readonly paused?: boolean
}

const getDuration = (element: HTMLAudioElement): number =>
  Number.isFinite(element.duration) ? element.duration : 0

export const AudioPlayerRoot = (props: AudioPlayerRootProps) => {
  const [currentTime, setCurrentTime] = createSignal(0)
  const [duration, setDuration] = createSignal(0)
  const [element, setElement] = createSignal<HTMLAudioElement | null>(null)
  const [muted, setMuted] = createSignal(false)
  const [paused, setPaused] = createSignal(true)
  const handlePlayFailure = (error: unknown) => props.onPlayError?.(error)

  const handleMediaEvent =
    (update: (media: HTMLAudioElement) => void): JSX.EventHandler<HTMLAudioElement, Event> =>
    (event) => {
      if (event.currentTarget === untrack(element)) {
        update(event.currentTarget)
      }
    }

  const handleDurationChange = handleMediaEvent((media) => setDuration(getDuration(media)))
  const handlePause = handleMediaEvent(() => setPaused(true))
  const media: AudioPlayerMediaBindings = {
    onDurationChange: handleDurationChange,
    onEmptied: handleMediaEvent(() => {
      setCurrentTime(0)
      setDuration(0)
      setPaused(true)
    }),
    onEnded: handlePause,
    onLoadedMetadata: handleDurationChange,
    onPause: handlePause,
    onPlay: handleMediaEvent(() => setPaused(false)),
    onTimeUpdate: handleMediaEvent((media) => setCurrentTime(media.currentTime)),
    onVolumeChange: handleMediaEvent((media) => setMuted(media.muted)),
    ref: setElement,
  }

  createEffect(() => {
    const audioElement = element()
    setCurrentTime(audioElement?.currentTime ?? 0)
    setDuration(audioElement === null ? 0 : getDuration(audioElement))
    setMuted(audioElement?.muted ?? false)
    setPaused(audioElement?.paused ?? true)

    if (audioElement === null) {
      return
    }

    onCleanup(() => audioElement.pause())

    untrack(() => {
      if (props.autoplay === true) {
        audioElement.load()
        audioElement.play().catch(handlePlayFailure)
      }
    })
  })

  const seek = (time: number) => {
    const audioElement = element()

    if (audioElement === null) {
      return
    }

    audioElement.currentTime = Math.min(Math.max(time, 0), getDuration(audioElement))
    setCurrentTime(audioElement.currentTime)
  }

  const toggleMuted = () => {
    const audioElement = element()

    if (audioElement === null) {
      return
    }

    audioElement.muted = !audioElement.muted
    setMuted(audioElement.muted)
  }

  const togglePlayback = () => {
    const audioElement = element()

    if (audioElement === null) {
      return
    }

    if (audioElement.paused) {
      audioElement.play().catch(handlePlayFailure)
      return
    }

    audioElement.pause()
  }

  createEffect(() => {
    if (props.paused === true) {
      element()?.pause()
    }
  })

  const state = createMemo(() => ({
    currentTime: currentTime(),
    duration: duration(),
    muted: muted(),
    paused: paused(),
  }))
  const value: AudioPlayerContextValue = [state, {seek, toggleMuted, togglePlayback}, media]

  return <AudioPlayerContext.Provider value={value}>{props.children}</AudioPlayerContext.Provider>
}
