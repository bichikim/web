import {type JSX, splitProps} from 'solid-js'

import {useAudioPlayer} from './context'

export interface AudioPlayerPlayButtonProps extends Omit<
  JSX.ButtonHTMLAttributes<HTMLButtonElement>,
  'aria-label' | 'onClick'
> {
  readonly onClick?: JSX.EventHandler<HTMLButtonElement, MouseEvent>
  readonly pauseLabel?: string
  readonly playLabel?: string
}

export const AudioPlayerPlayButton = (props: AudioPlayerPlayButtonProps) => {
  const [state, actions] = useAudioPlayer()
  const [localProps, restProps] = splitProps(props, [
    'children',
    'onClick',
    'pauseLabel',
    'playLabel',
    'type',
  ])
  const handleClick: JSX.EventHandler<HTMLButtonElement, MouseEvent> = (event) => {
    localProps.onClick?.(event)

    if (!event.defaultPrevented) {
      actions.togglePlayback()
    }
  }

  return (
    <button
      {...restProps}
      aria-label={
        state().paused
          ? (localProps.playLabel ?? 'Play audio')
          : (localProps.pauseLabel ?? 'Pause audio')
      }
      aria-pressed={!state().paused}
      data-state={state().paused ? 'paused' : 'playing'}
      onClick={handleClick}
      type={localProps.type ?? 'button'}
    >
      {localProps.children}
    </button>
  )
}
