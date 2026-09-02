import {type Accessor, createContext, useContext} from 'solid-js'

export interface AudioPlayerState {
  readonly currentTime: number
  readonly duration: number
  readonly muted: boolean
  readonly paused: boolean
}

export interface AudioPlayerActions {
  readonly connect: (element: HTMLAudioElement) => void
  readonly seek: (time: number) => void
  readonly toggleMuted: () => void
  readonly togglePlayback: () => void
}

export type AudioPlayerContextValue = readonly [Accessor<AudioPlayerState>, AudioPlayerActions]

export const AudioPlayerContext = createContext<AudioPlayerContextValue>()

export const useAudioPlayer = (): AudioPlayerContextValue => {
  const context = useContext(AudioPlayerContext)

  if (context === undefined) {
    throw new Error('Audio player parts must be rendered inside AudioPlayer.Root.')
  }

  return context
}
