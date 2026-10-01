import {
  createMemo,
  createSignal,
  createUniqueId,
  onCleanup,
  type ParentProps,
  untrack,
} from 'solid-js'
import {type Message, ToastContext, ToastInnerContext, type ToastInput} from './context'

const VISIBLE_LIMIT = 3

export interface ToastProviderProps extends ParentProps {
  //
}

type CloseDisposer = () => void
type DismissRequest = () => void

export const ToastProvider = (props: ToastProviderProps) => {
  const [messages, setMessages] = createSignal(new Map<string | number, Message>())
  const closeDisposers = new Map<string | number, CloseDisposer>()
  const dismissRequests = new Map<string | number, DismissRequest>()
  const prefix = createUniqueId()
  let nextId = 0
  const visible = createMemo(() => [...messages().values()].slice(0, VISIBLE_LIMIT))
  const count = createMemo(() => messages().size)
  const waitingCount = createMemo(() => Math.max(0, count() - VISIBLE_LIMIT))

  const turnOffMessage = (id: string | number) => {
    closeDisposers.get(id)?.()
    closeDisposers.delete(id)

    setMessages((prev) => {
      const next = new Map(prev)
      next.delete(id)

      return next
    })
  }

  const dismissToast = (id: string | number) => {
    const request = dismissRequests.get(id)
    if (request === undefined) {
      turnOffMessage(id)
      return
    }
    request()
  }

  const registerDismiss = (id: string | number, request: () => void) => {
    dismissRequests.set(id, request)
    return () => {
      if (dismissRequests.get(id) === request) {
        dismissRequests.delete(id)
      }
    }
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
        dismissToast(message.id)
      }
    })

    if (disposer && untrack(messages).get(message.id) === message) {
      closeDisposers.set(message.id, disposer)
    } else {
      disposer?.()
    }
  }

  const showToast = (input: ToastInput) => {
    if (input.message.trim().length === 0) {
      return null
    }
    nextId += 1
    const id = `${prefix}-toast-${nextId}`
    setMessage({id, message: input.message, tone: input.tone ?? 'notification'})
    return id
  }

  onCleanup(() => {
    for (const dispose of closeDisposers.values()) {
      dispose()
    }

    closeDisposers.clear()
    dismissRequests.clear()
  })

  return (
    <ToastContext.Provider
      value={{dismissToast, registerDismiss, setMessage, showToast, turnOffMessage}}
    >
      <ToastInnerContext.Provider value={{count, messages, visible, waitingCount}}>
        {props.children}
      </ToastInnerContext.Provider>
    </ToastContext.Provider>
  )
}
