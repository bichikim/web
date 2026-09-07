import {cx} from 'class-variance-authority'
import {type JSX, splitProps} from 'solid-js'
import {TEXT_CONTROL} from './field-classes'

export interface PTextareaProps extends JSX.TextareaHTMLAttributes<HTMLTextAreaElement> {
  readonly unstyled?: boolean
}

export const PTextarea = (props: PTextareaProps) => {
  const [local, rest] = splitProps(props, ['class', 'unstyled'])
  return <textarea {...rest} class={cx(!local.unstyled && [TEXT_CONTROL, 'py-3'], local.class)} />
}
