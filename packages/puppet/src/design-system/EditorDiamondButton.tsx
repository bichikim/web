import {type JSX} from '@solidjs/web'
import {omit} from 'solid-js'

export const EditorDiamondButton = (props: JSX.ButtonHTMLAttributes<HTMLButtonElement>) => {
  const rest = omit(props, 'class', 'type')
  return (
    <button
      type={props.type ?? 'button'}
      class={['editor-diamond-button', props.class]}
      {...rest}
    />
  )
}
