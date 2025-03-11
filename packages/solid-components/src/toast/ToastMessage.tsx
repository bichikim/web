import {ToastContentContext} from './context'
import {ComponentProps, useContext} from 'solid-js'

export type ToastMessageProps = ComponentProps<'span'>

export const ToastMessage = (props: ToastMessageProps) => {
  const {message} = useContext(ToastContentContext)

  return <span {...props}>{message.message}</span>
}
