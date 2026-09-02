import {type JSX, splitProps} from 'solid-js'

import {useAudioPlayer} from './context'

export type AudioPlayerMediaProps = Omit<JSX.AudioHTMLAttributes<HTMLAudioElement>, 'ref'>

export const AudioPlayerMedia = (props: AudioPlayerMediaProps) => {
  const [, actions] = useAudioPlayer()
  const [localProps, restProps] = splitProps(props, ['children'])

  return (
    <audio {...restProps} ref={actions.connect}>
      {localProps.children}
    </audio>
  )
}
