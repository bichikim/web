import {type JSX, splitProps} from 'solid-js'

import {useAudioPlayer} from './context'

export interface AudioPlayerMuteButtonProps extends Omit<
  JSX.ButtonHTMLAttributes<HTMLButtonElement>,
  'aria-label' | 'onClick'
> {
  readonly muteLabel?: string
  readonly onClick?: JSX.EventHandler<HTMLButtonElement, MouseEvent>
  readonly unmuteLabel?: string
}

export const AudioPlayerMuteButton = (props: AudioPlayerMuteButtonProps) => {
  const player = useAudioPlayer()
  const [localProps, restProps] = splitProps(props, [
    'children',
    'muteLabel',
    'onClick',
    'type',
    'unmuteLabel',
  ])
  const handleClick: JSX.EventHandler<HTMLButtonElement, MouseEvent> = (event) => {
    localProps.onClick?.(event)

    if (!event.defaultPrevented) {
      player.toggleMuted()
    }
  }

  return (
    <button
      {...restProps}
      aria-label={
        player.muted()
          ? (localProps.unmuteLabel ?? 'Unmute audio')
          : (localProps.muteLabel ?? 'Mute audio')
      }
      aria-pressed={player.muted()}
      data-muted={player.muted()}
      onClick={handleClick}
      type={localProps.type ?? 'button'}
    >
      {localProps.children}
    </button>
  )
}
