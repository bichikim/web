import {createSignal, onCleanup, ParentProps, untrack} from 'solid-js'
import {Message, ToastContext, ToastInnerContext} from './context'

export interface ToastProviderProps extends ParentProps {
  //
}

type CloseDisposer = () => void

export const ToastProvider = (props: ToastProviderProps) => {
  const [messages, setMessages] = createSignal(new Map<string | number, Message>())
  const closeDisposers = new Map<string | number, CloseDisposer>()

  const turnOffMessage = (id: string | number) => {
    closeDisposers.get(id)?.()
    closeDisposers.delete(id)

    setMessages((prev) => {
      const next = new Map(prev)
      next.delete(id)

      return next
    })
  }

  const setMessage = (message: Message) => {
    turnOffMessage(message.id)

    setMessages((prev) => {
      const {id} = message
      const next = new Map(prev)

      next.set(id, message)

      return next
    })

    const disposer = message.closeHook?.(() => {
      if (untrack(messages).get(message.id) === message) {
        turnOffMessage(message.id)
      }
    })

    if (disposer && untrack(messages).get(message.id) === message) {
      closeDisposers.set(message.id, disposer)
    } else {
      disposer?.()
    }
  }

  onCleanup(() => {
    for (const dispose of closeDisposers.values()) {
      dispose()
    }

    closeDisposers.clear()
  })

  return (
    <ToastContext.Provider value={{setMessage, turnOffMessage}}>
      <ToastInnerContext.Provider value={{messages}}>{props.children}</ToastInnerContext.Provider>
    </ToastContext.Provider>
  )
}
