import {ComponentProps, createMemo, For, useContext} from 'solid-js'
import {ToastActionContext, ToastActionsContext, ToastContext} from './context'

export interface ToastActionListProps extends ComponentProps<'div'> {}

export const ToastActionList = (props: ToastActionListProps) => {
  const {turnOffMessage} = useContext(ToastContext)
  const actionsContext = useContext(ToastActionsContext)

  const actions = createMemo(() => {
    if (!actionsContext) {
      return
    }

    return actionsContext.actions
  })

  const handleClose = () => {
    if (!actionsContext) {
      return
    }

    turnOffMessage(actionsContext.id)
  }

  return (
    <For each={actions()}>
      {(action) => (
        <ToastActionContext.Provider value={{...action, onClose: handleClose}}>
          {props.children}
        </ToastActionContext.Provider>
      )}
    </For>
  )
}
