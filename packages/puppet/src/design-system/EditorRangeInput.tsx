import {type JSX} from '@solidjs/web'
import {omit} from 'solid-js'
import type {ControlSizeProps} from './control-size'

interface EditorRangeInputProps
  extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'>, ControlSizeProps {}

export const EditorRangeInput = (props: EditorRangeInputProps) => {
  const rest = omit(props, 'class', 'size')
  return (
    <input
      type="range"
      class={['editor-control editor-range-input', props.class]}
      data-control-size={props.size ?? 'sm'}
      {...rest}
    />
  )
}
