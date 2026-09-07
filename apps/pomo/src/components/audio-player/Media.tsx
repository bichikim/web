import {type JSX, onCleanup, splitProps} from 'solid-js'

import {useAudioPlayer} from './context'

export type AudioPlayerMediaProps = Omit<JSX.AudioHTMLAttributes<HTMLAudioElement>, 'ref'>

const callEventHandler = (
  handler: JSX.EventHandlerUnion<HTMLAudioElement, Event> | undefined,
  event: Parameters<JSX.EventHandler<HTMLAudioElement, Event>>[0],
) => {
  if (typeof handler === 'function') {
    handler(event)
    return
  }

  handler?.[0](handler[1], event)
}

export const AudioPlayerMedia = (props: AudioPlayerMediaProps) => {
  const [, , media] = useAudioPlayer()
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

  onCleanup(() => media.ref(null))

  return (
    <audio
      {...restProps}
      ref={media.ref}
      onDurationChange={(event) => {
        media.onDurationChange(event)
        callEventHandler(localProps.onDurationChange, event)
      }}
      onEmptied={(event) => {
        media.onEmptied(event)
        callEventHandler(localProps.onEmptied, event)
      }}
      onEnded={(event) => {
        media.onEnded(event)
        callEventHandler(localProps.onEnded, event)
      }}
      onLoadedMetadata={(event) => {
        media.onLoadedMetadata(event)
        callEventHandler(localProps.onLoadedMetadata, event)
      }}
      onPause={(event) => {
        media.onPause(event)
        callEventHandler(localProps.onPause, event)
      }}
      onPlay={(event) => {
        media.onPlay(event)
        callEventHandler(localProps.onPlay, event)
      }}
      onTimeUpdate={(event) => {
        media.onTimeUpdate(event)
        callEventHandler(localProps.onTimeUpdate, event)
      }}
      onVolumeChange={(event) => {
        media.onVolumeChange(event)
        callEventHandler(localProps.onVolumeChange, event)
      }}
    >
      {localProps.children}
    </audio>
  )
}
