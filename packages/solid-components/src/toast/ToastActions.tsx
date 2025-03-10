import {ComponentProps, createMemo, For, Show, useContext} from 'solid-js'
import {ToastActionContext, ToastActionsContext, ToastContext} from './context'

export interface ToastActionsProps extends ComponentProps<'div'> {
  //
}

export const ToastActions = (props: ToastActionsProps) => {
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
    <Show when={Array.isArray(actions())}>
      <div {...props}>
        <For each={actions()}>
          {(action) => (
            <ToastActionContext.Provider value={{...action, onClose: handleClose}}>
              {props.children}
            </ToastActionContext.Provider>
          )}
        </For>
      </div>
    </Show>
  )
}
