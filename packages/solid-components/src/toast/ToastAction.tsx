import {ToastActionContext} from './context'
import {ComponentProps, useContext} from 'solid-js'

export type ToastActionProps = ComponentProps<'button'>

export const ToastAction = (props: ToastActionProps) => {
  const action = useContext(ToastActionContext)

  const handleClick = () => {
    if (action.type !== 'click') {
      return
    }

    action.action?.()

    if (action.actionToClose) {
      action.onClose?.()
    }
  }

  return (
    <button {...props} onClick={handleClick}>
      {action.label}
    </button>
  )
}
