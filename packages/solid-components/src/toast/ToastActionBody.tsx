import {ComponentProps, createMemo, Show, useContext} from 'solid-js'
import {ToastActionsContext} from './context'

export interface ToastActionBodyProps extends ComponentProps<'div'> {}

export const ToastActionBody = (props: ToastActionBodyProps) => {
  const actionsContext = useContext(ToastActionsContext)

  const actions = createMemo(() => {
    if (!actionsContext) {
      return
    }

    return actionsContext.actions
  })

  return (
    <Show when={Array.isArray(actions())}>
      <div {...props}>{props.children}</div>
    </Show>
  )
}
