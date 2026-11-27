import type {ControlSizeProps} from './control-size'
import {type JSX} from '@solidjs/web'
import {omit} from 'solid-js'

interface EditorButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement>, ControlSizeProps {}

export const EditorButton = (props: EditorButtonProps) => {
  const rest = omit(props, 'class', 'type', 'size', 'title')
  return (
    <button
      type={props.type ?? 'button'}
      data-tooltip={props.title}
      data-control-size={props.size ?? 'sm'}
      class={['editor-control editor-button', props.class]}
      {...rest}
    />
  )
}
