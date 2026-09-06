import {cx} from 'class-variance-authority'
import {type JSX, splitProps} from 'solid-js'
import {TEXT_CONTROL} from './field-classes'

export interface PInputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
  readonly unstyled?: boolean
}

export const PInput = (props: PInputProps) => {
  const [local, rest] = splitProps(props, ['class', 'unstyled'])
  return <input {...rest} class={cx(!local.unstyled && TEXT_CONTROL, local.class)} />
}
