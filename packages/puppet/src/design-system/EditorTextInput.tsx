import type {ControlSizeProps} from './control-size'
import {TextField, type TextFieldInputProps} from '@kobalte/core/text-field'
import {type JSX, splitProps} from 'solid-js'

interface EditorTextInputProps
  extends
    Omit<JSX.InputHTMLAttributes<HTMLInputElement>, keyof TextFieldInputProps<'input'> | 'size'>,
    TextFieldInputProps<'input'>,
    ControlSizeProps {}

export const EditorTextInput = (props: EditorTextInputProps) => {
  const [local, rest] = splitProps(props, ['class', 'size'])
  return (
    <TextField.Input
      data-control-size={local.size ?? 'sm'}
      class={`editor-control editor-text-input ${local.class ?? ''}`}
      {...rest}
    />
  )
}
