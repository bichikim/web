import {createEffect, createMemo, createSignal, onCleanup, type ParentProps} from 'solid-js'

import {AudioPlayerContext, type AudioPlayerContextValue} from './context'

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
  let disconnect: (() => void) | null = null

  const handlePlayFailure = (error: unknown) => props.onPlayError?.(error)

  const connect = (nextElement: HTMLAudioElement) => {
    disconnect?.()
    setElement(nextElement)

    const handleDurationChange = () => setDuration(getDuration(nextElement))
    const handleEmptied = () => {
      setCurrentTime(0)
      setDuration(0)
      setPaused(true)
    }
    const handlePause = () => setPaused(true)
    const handlePlay = () => setPaused(false)
    const handleTimeUpdate = () => setCurrentTime(nextElement.currentTime)
    const handleVolumeChange = () => setMuted(nextElement.muted)

    nextElement.addEventListener('durationchange', handleDurationChange)
    nextElement.addEventListener('emptied', handleEmptied)
    nextElement.addEventListener('ended', handlePause)
    nextElement.addEventListener('loadedmetadata', handleDurationChange)
    nextElement.addEventListener('pause', handlePause)
    nextElement.addEventListener('play', handlePlay)
    nextElement.addEventListener('timeupdate', handleTimeUpdate)
    nextElement.addEventListener('volumechange', handleVolumeChange)

    setCurrentTime(nextElement.currentTime)
    setDuration(getDuration(nextElement))
    setMuted(nextElement.muted)
    setPaused(nextElement.paused)

    disconnect = () => {
      nextElement.removeEventListener('durationchange', handleDurationChange)
      nextElement.removeEventListener('emptied', handleEmptied)
      nextElement.removeEventListener('ended', handlePause)
      nextElement.removeEventListener('loadedmetadata', handleDurationChange)
      nextElement.removeEventListener('pause', handlePause)
      nextElement.removeEventListener('play', handlePlay)
      nextElement.removeEventListener('timeupdate', handleTimeUpdate)
      nextElement.removeEventListener('volumechange', handleVolumeChange)
    }

    if (props.autoplay === true) {
      nextElement.load()
      nextElement.play().catch(handlePlayFailure)
    }
  }

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

  onCleanup(() => {
    element()?.pause()
    disconnect?.()
  })

  const state = createMemo(() => ({
    currentTime: currentTime(),
    duration: duration(),
    muted: muted(),
    paused: paused(),
  }))
  const value: AudioPlayerContextValue = [state, {connect, seek, toggleMuted, togglePlayback}]

  return <AudioPlayerContext.Provider value={value}>{props.children}</AudioPlayerContext.Provider>
}
