import {ToastContentContext} from './context'
import {ComponentProps, Show, useContext} from 'solid-js'

export type ToastTitleProps = ComponentProps<'span'>

export const ToastTitle = (props: ToastTitleProps) => {
  const {message} = useContext(ToastContentContext)

  return (
    <Show when={message.title}>
      <span {...props}>{message.title}</span>
    </Show>
  )
}
