import {type Accessor, createContext, type JSX, useContext} from 'solid-js'

export interface AudioPlayerState {
  readonly currentTime: number
  readonly duration: number
  readonly muted: boolean
  readonly paused: boolean
}

export interface AudioPlayerActions {
  readonly seek: (time: number) => void
  readonly toggleMuted: () => void
  readonly togglePlayback: () => void
}

export interface AudioPlayerMediaBindings {
  readonly ref: (element: HTMLAudioElement | null) => void
  readonly onDurationChange: JSX.EventHandler<HTMLAudioElement, Event>
  readonly onEmptied: JSX.EventHandler<HTMLAudioElement, Event>
  readonly onEnded: JSX.EventHandler<HTMLAudioElement, Event>
  readonly onLoadedMetadata: JSX.EventHandler<HTMLAudioElement, Event>
  readonly onPause: JSX.EventHandler<HTMLAudioElement, Event>
  readonly onPlay: JSX.EventHandler<HTMLAudioElement, Event>
  readonly onTimeUpdate: JSX.EventHandler<HTMLAudioElement, Event>
  readonly onVolumeChange: JSX.EventHandler<HTMLAudioElement, Event>
}

export type AudioPlayerContextValue = readonly [
  Accessor<AudioPlayerState>,
  AudioPlayerActions,
  AudioPlayerMediaBindings,
]

export const AudioPlayerContext = createContext<AudioPlayerContextValue>()

export const useAudioPlayer = (): AudioPlayerContextValue => {
  const context = useContext(AudioPlayerContext)

  if (context === undefined) {
    throw new Error('Audio player parts must be rendered inside AudioPlayer.Root.')
  }

  return context
}
