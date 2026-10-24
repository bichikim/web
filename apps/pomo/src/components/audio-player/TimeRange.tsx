import {type JSX, splitProps} from 'solid-js'

import {useAudioPlayer} from './context'

export interface AudioPlayerTimeRangeProps extends Omit<
  JSX.InputHTMLAttributes<HTMLInputElement>,
  'aria-valuetext' | 'max' | 'min' | 'onInput' | 'type' | 'value'
> {
  readonly formatValueText?: (currentTime: number, duration: number) => string
  readonly onInput?: JSX.EventHandler<HTMLInputElement, InputEvent>
}

const DEFAULT_TIME_STEP_SECONDS = 0.1
const formatValueText = (currentTime: number, duration: number) =>
  `${currentTime.toFixed(1)} / ${duration.toFixed(1)} seconds`

export const AudioPlayerTimeRange = (props: AudioPlayerTimeRangeProps) => {
  const player = useAudioPlayer()
  const [localProps, restProps] = splitProps(props, ['formatValueText', 'onInput', 'step'])
  const valueText = () =>
    (localProps.formatValueText ?? formatValueText)(player.currentTime(), player.duration())
  const handleInput: JSX.EventHandler<HTMLInputElement, InputEvent> = (event) => {
    localProps.onInput?.(event)

    if (!event.defaultPrevented) {
      player.seek(event.currentTarget.valueAsNumber)
    }
  }

  return (
    <input
      {...restProps}
      aria-valuetext={valueText()}
      disabled={player.duration() <= 0 || restProps.disabled}
      max={player.duration()}
      min={0}
      onInput={handleInput}
      step={localProps.step ?? DEFAULT_TIME_STEP_SECONDS}
      type="range"
      value={player.currentTime()}
    />
  )
}
