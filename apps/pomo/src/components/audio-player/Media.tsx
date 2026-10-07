import {callEventHandler} from 'src/utils/call-event-handler'
import {type JSX, onCleanup, splitProps} from 'solid-js'

import {useAudioPlayer} from './context'

export type AudioPlayerMediaProps = Omit<JSX.AudioHTMLAttributes<HTMLAudioElement>, 'ref'>

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

  onCleanup(() => player.ref(null))

  return (
    <audio
      {...restProps}
      ref={player.ref}
      onDurationChange={(event) => {
        player.onDurationChange(event)
        callEventHandler(localProps.onDurationChange, event)
      }}
      onEmptied={(event) => {
        player.onEmptied(event)
        callEventHandler(localProps.onEmptied, event)
      }}
      onEnded={(event) => {
        player.onEnded(event)
        callEventHandler(localProps.onEnded, event)
      }}
      onLoadedMetadata={(event) => {
        player.onLoadedMetadata(event)
        callEventHandler(localProps.onLoadedMetadata, event)
      }}
      onPause={(event) => {
        player.onPause(event)
        callEventHandler(localProps.onPause, event)
      }}
      onPlay={(event) => {
        player.onPlay(event)
        callEventHandler(localProps.onPlay, event)
      }}
      onTimeUpdate={(event) => {
        player.onTimeUpdate(event)
        callEventHandler(localProps.onTimeUpdate, event)
      }}
      onVolumeChange={(event) => {
        player.onVolumeChange(event)
        callEventHandler(localProps.onVolumeChange, event)
      }}
    >
      {localProps.children}
    </audio>
  )
}
