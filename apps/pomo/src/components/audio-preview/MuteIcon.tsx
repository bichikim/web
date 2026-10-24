import {useAudioPlayer} from '../audio-player'

export const MuteIcon = () => {
  const player = useAudioPlayer()

  return (
    <span
      aria-hidden="true"
      class={player.muted() ? 'i-tabler-volume-off size-4' : 'i-tabler-volume size-4'}
    />
  )
}
