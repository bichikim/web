import {type JSX, splitProps} from 'solid-js'

export const EditorButton = (props: JSX.ButtonHTMLAttributes<HTMLButtonElement>) => {
  const [local, rest] = splitProps(props, ['class', 'type'])
  return (
    <button type={local.type ?? 'button'} class={`editor-button ${local.class ?? ''}`} {...rest} />
  )
}
