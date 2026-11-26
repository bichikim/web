import {type JSX} from '@solidjs/web'
import {omit} from 'solid-js'
import type {ControlSizeProps} from './control-size'
import {EditorButton} from './EditorButton'

interface EditorToggleButtonProps
  extends JSX.ButtonHTMLAttributes<HTMLButtonElement>, ControlSizeProps {
  readonly pressed?: boolean
}

export const EditorToggleButton = (props: EditorToggleButtonProps) => {
  const rest = omit(props, 'pressed')
  return <EditorButton aria-pressed={props.pressed ? 'true' : 'false'} {...rest} />
}
