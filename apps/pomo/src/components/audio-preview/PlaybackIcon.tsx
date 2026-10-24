import {useAudioPlayer} from '../audio-player'

export const PlaybackIcon = () => {
  const player = useAudioPlayer()

  return (
    <span
      aria-hidden="true"
      class={player.paused() ? 'i-tabler-player-play size-4' : 'i-tabler-player-pause size-4'}
    />
  )
}
