import {
  type Accessor,
  createEffect,
  createSignal,
  type JSX,
  on,
  onCleanup,
  useContext,
} from 'solid-js'
import {createTimeout, type Message, ToastContext, ToastInnerContext} from './context'

const NOTIFICATION_DURATION = 10_000

export interface ToastExit {
  readonly closing: Accessor<boolean>
  readonly completeDismiss: () => void
}

export interface ToastEntryProps {
  readonly deferDismiss?: boolean
  readonly message: Message
  readonly children: (message: Message, dismiss: () => void, exit: ToastExit) => JSX.Element
}

export const ToastEntry = (props: ToastEntryProps) => {
  const actions = useContext(ToastContext)
  const state = useContext(ToastInnerContext)
  const [closing, setClosing] = createSignal(false)
  const handleDismiss = () => actions.dismissToast(props.message.id)
  const completeDismiss = () => {
    if (closing() && state.messages().get(props.message.id) === props.message) {
      actions.turnOffMessage(props.message.id)
    }
  }

  createEffect(() => {
    const currentMessage = props.message
    setClosing(false)
    if (props.deferDismiss) {
      const dispose = actions.registerDismiss(currentMessage.id, () => setClosing(true))
      onCleanup(() => {
        dispose()
        if (closing() && state.messages().get(currentMessage.id) === currentMessage) {
          actions.turnOffMessage(currentMessage.id)
        }
      })
    }
  })

  createEffect(
    on(
      () => props.message,
      (message) => {
        if (message.tone === 'notification' && message.closeHook === undefined) {
          const dispose = createTimeout(NOTIFICATION_DURATION)(() => {
            if (state.messages().get(message.id) === message) {
              actions.dismissToast(message.id)
            }
          })
          onCleanup(dispose)
        }
      },
    ),
  )

  return <>{props.children(props.message, handleDismiss, {closing, completeDismiss})}</>
}
