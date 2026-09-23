import {type JSX, splitProps} from 'solid-js'
import type {ControlSizeProps} from './control-size'
import {EditorButton} from './EditorButton'

interface EditorToggleButtonProps
  extends JSX.ButtonHTMLAttributes<HTMLButtonElement>, ControlSizeProps {
  readonly pressed?: boolean
}

export const EditorToggleButton = (props: EditorToggleButtonProps) => {
  const [local, rest] = splitProps(props, ['pressed'])
  return <EditorButton aria-pressed={local.pressed ?? false} {...rest} />
}
