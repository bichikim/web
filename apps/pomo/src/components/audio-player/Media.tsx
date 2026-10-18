import {type JSX, onCleanup, splitProps} from 'solid-js'

import {useAudioPlayer} from './context'

type NativeAudioProps = Omit<
  JSX.AudioHTMLAttributes<HTMLAudioElement>,
  | 'ref'
  | 'onDurationChange'
  | 'onEmptied'
  | 'onEnded'
  | 'onLoadedMetadata'
  | 'onPause'
  | 'onPlay'
  | 'onTimeUpdate'
  | 'onVolumeChange'
>

export interface AudioPlayerMediaProps extends NativeAudioProps {
  readonly onDurationChange?: JSX.EventHandler<HTMLAudioElement, Event>
  readonly onEmptied?: JSX.EventHandler<HTMLAudioElement, Event>
  readonly onEnded?: JSX.EventHandler<HTMLAudioElement, Event>
  readonly onLoadedMetadata?: JSX.EventHandler<HTMLAudioElement, Event>
  readonly onPause?: JSX.EventHandler<HTMLAudioElement, Event>
  readonly onPlay?: JSX.EventHandler<HTMLAudioElement, Event>
  readonly onTimeUpdate?: JSX.EventHandler<HTMLAudioElement, Event>
  readonly onVolumeChange?: JSX.EventHandler<HTMLAudioElement, Event>
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
    localProps.onDurationChange?.(event)
  }
  const handleEmptied: JSX.EventHandler<HTMLAudioElement, Event> = (event) => {
    player.onEmptied(event)
    localProps.onEmptied?.(event)
  }
  const handleEnded: JSX.EventHandler<HTMLAudioElement, Event> = (event) => {
    player.onEnded(event)
    localProps.onEnded?.(event)
  }
  const handleLoadedMetadata: JSX.EventHandler<HTMLAudioElement, Event> = (event) => {
    player.onLoadedMetadata(event)
    localProps.onLoadedMetadata?.(event)
  }
  const handlePause: JSX.EventHandler<HTMLAudioElement, Event> = (event) => {
    player.onPause(event)
    localProps.onPause?.(event)
  }
  const handlePlay: JSX.EventHandler<HTMLAudioElement, Event> = (event) => {
    player.onPlay(event)
    localProps.onPlay?.(event)
  }
  const handleTimeUpdate: JSX.EventHandler<HTMLAudioElement, Event> = (event) => {
    player.onTimeUpdate(event)
    localProps.onTimeUpdate?.(event)
  }
  const handleVolumeChange: JSX.EventHandler<HTMLAudioElement, Event> = (event) => {
    player.onVolumeChange(event)
    localProps.onVolumeChange?.(event)
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
