import {ToastContentContext} from './context'
import {ComponentProps, useContext} from 'solid-js'

export type ToastContentProps = ComponentProps<'span'>

export const ToastContent = (props: ToastContentProps) => {
  const {message} = useContext(ToastContentContext)

  return <span {...props}>{message.message}</span>
}
