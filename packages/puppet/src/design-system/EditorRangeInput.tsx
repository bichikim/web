import {type JSX, splitProps} from 'solid-js'
import type {ControlSizeProps} from './control-size'

interface EditorRangeInputProps
  extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'>, ControlSizeProps {}

export const EditorRangeInput = (props: EditorRangeInputProps) => {
  const [local, rest] = splitProps(props, ['class', 'size'])
  return (
    <input
      type="range"
      class={`editor-control editor-range-input ${local.class ?? ''}`}
      data-control-size={local.size ?? 'sm'}
      {...rest}
    />
  )
}
