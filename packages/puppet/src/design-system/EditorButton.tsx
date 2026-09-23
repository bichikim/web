import type {ControlSizeProps} from './control-size'
import {type JSX, splitProps} from 'solid-js'

interface EditorButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement>, ControlSizeProps {}

export const EditorButton = (props: EditorButtonProps) => {
  const [local, rest] = splitProps(props, ['class', 'type', 'size', 'title'])
  return (
    <button
      type={local.type ?? 'button'}
      data-tooltip={local.title}
      data-control-size={local.size ?? 'sm'}
      class={`editor-control editor-button ${local.class ?? ''}`}
      {...rest}
    />
  )
}
