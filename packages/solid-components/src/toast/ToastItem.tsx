import {ToastActionsContext, ToastContentContext} from './context'
import {useClose} from 'src/close'
import {ComponentProps, createMemo, useContext} from 'solid-js'
import {Dynamic} from 'solid-js/web'

export type ToastItemProps = ComponentProps<'div'>

export const ToastItem = (props: ToastItemProps) => {
  const {message} = useContext(ToastContentContext)
  const [, {handleShow}] = useClose()

  const handleClick = () => {
    if (message.clickToClose) {
      handleShow(false)
    }
  }

  const rootTag = createMemo(() => {
    if (message.clickToClose) {
      return 'button'
    }

    return 'div'
  })

  const actionsContext = createMemo(() => {
    if (message.clickToClose) {
      return
    }

    return {
      actions: message.actions,
      id: message.id,
    }
  })

  return (
    <Dynamic {...props} component={rootTag()} onClick={handleClick}>
      <ToastActionsContext.Provider value={actionsContext()}>{props.children}</ToastActionsContext.Provider>
    </Dynamic>
  )
}
