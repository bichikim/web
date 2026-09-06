import {useAudioPlayer} from '../audio-player'

export const MuteIcon = () => {
  const [state] = useAudioPlayer()

  return (
    <span
      aria-hidden="true"
      class={state().muted ? 'i-tabler-volume-off size-4' : 'i-tabler-volume size-4'}
    />
  )
}
