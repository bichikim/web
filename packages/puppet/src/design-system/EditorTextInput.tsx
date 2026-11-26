import type {ControlSizeProps} from './control-size'
import {TextField, type TextFieldInputProps} from '@kobalte/core/text-field'
import {type JSX} from '@solidjs/web'
import {omit} from 'solid-js'

interface EditorTextInputProps
  extends
    Omit<JSX.InputHTMLAttributes<HTMLInputElement>, keyof TextFieldInputProps<'input'> | 'size'>,
    TextFieldInputProps<'input'>,
    ControlSizeProps {}

export const EditorTextInput = (props: EditorTextInputProps) => {
  const rest = omit(props, 'class', 'size')
  return (
    <TextField.Input
      data-control-size={props.size ?? 'sm'}
      class={['editor-control editor-text-input', props.class]}
      {...rest}
    />
  )
}
