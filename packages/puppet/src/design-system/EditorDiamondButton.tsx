import {type JSX, splitProps} from 'solid-js'

export const EditorDiamondButton = (props: JSX.ButtonHTMLAttributes<HTMLButtonElement>) => {
  const [local, rest] = splitProps(props, ['class', 'type'])
  return (
    <button
      type={local.type ?? 'button'}
      class={`editor-diamond-button ${local.class ?? ''}`}
      {...rest}
    />
  )
}
