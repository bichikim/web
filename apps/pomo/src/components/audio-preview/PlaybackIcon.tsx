import {useAudioPlayer} from '../audio-player'

export const PlaybackIcon = () => {
  const [state] = useAudioPlayer()

  return (
    <span
      aria-hidden="true"
      class={state().paused ? 'i-tabler-player-play size-4' : 'i-tabler-player-pause size-4'}
    />
  )
}
