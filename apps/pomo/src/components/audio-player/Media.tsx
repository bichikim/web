import {type JSX, onCleanup, splitProps} from 'solid-js'

import {useAudioPlayer} from './context'

export type AudioPlayerMediaProps = Omit<JSX.AudioHTMLAttributes<HTMLAudioElement>, 'ref'>

const callMediaHandler = (
  handler: JSX.EventHandlerUnion<HTMLAudioElement, Event> | undefined,
  event: Parameters<JSX.EventHandler<HTMLAudioElement, Event>>[0],
): void => {
  if (typeof handler === 'function') {
    handler(event)
  } else if (handler !== undefined) {
    handler[0](handler[1], event)
  }
}

export const AudioPlayerMedia = (props: AudioPlayerMediaProps) => {
  const player = useAudioPlayer()
  const [localProps, restProps] = splitProps(props, [
    'children',
    'onDurationChange',
    'onEmptied',
    'onEnded',
    'onLoadedMetadata',
    'onPause',
    'onPlay',
    'onTimeUpdate',
    'onVolumeChange',
  ])

  const handleDurationChange: JSX.EventHandler<HTMLAudioElement, Event> = (event) => {
    player.onDurationChange(event)
    callMediaHandler(localProps.onDurationChange, event)
  }
  const handleEmptied: JSX.EventHandler<HTMLAudioElement, Event> = (event) => {
    player.onEmptied(event)
    callMediaHandler(localProps.onEmptied, event)
  }
  const handleEnded: JSX.EventHandler<HTMLAudioElement, Event> = (event) => {
    player.onEnded(event)
    callMediaHandler(localProps.onEnded, event)
  }
  const handleLoadedMetadata: JSX.EventHandler<HTMLAudioElement, Event> = (event) => {
    player.onLoadedMetadata(event)
    callMediaHandler(localProps.onLoadedMetadata, event)
  }
  const handlePause: JSX.EventHandler<HTMLAudioElement, Event> = (event) => {
    player.onPause(event)
    callMediaHandler(localProps.onPause, event)
  }
  const handlePlay: JSX.EventHandler<HTMLAudioElement, Event> = (event) => {
    player.onPlay(event)
    callMediaHandler(localProps.onPlay, event)
  }
  const handleTimeUpdate: JSX.EventHandler<HTMLAudioElement, Event> = (event) => {
    player.onTimeUpdate(event)
    callMediaHandler(localProps.onTimeUpdate, event)
  }
  const handleVolumeChange: JSX.EventHandler<HTMLAudioElement, Event> = (event) => {
    player.onVolumeChange(event)
    callMediaHandler(localProps.onVolumeChange, event)
  }

  onCleanup(() => player.ref(null))

  return (
    <audio
      {...restProps}
      ref={player.ref}
      onDurationChange={handleDurationChange}
      onEmptied={handleEmptied}
      onEnded={handleEnded}
      onLoadedMetadata={handleLoadedMetadata}
      onPause={handlePause}
      onPlay={handlePlay}
      onTimeUpdate={handleTimeUpdate}
      onVolumeChange={handleVolumeChange}
    >
      {localProps.children}
    </audio>
  )
}
