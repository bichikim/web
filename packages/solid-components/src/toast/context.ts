import {Accessor, createContext, Setter} from 'solid-js'

export const createTimeout = (timeout: number) => {
  return (callback: () => void) => {
    const timeoutId = setTimeout(() => {
      callback()
    }, timeout)

    return () => clearTimeout(timeoutId)
  }
}

export interface MutableMessageAction {
  label: string
  props?: Record<string, any>
}

export interface MutableMessage {
  message?: string
  sharedActionProps?: Record<string, any>
  title?: string
}

export interface MessageAction extends MutableMessageAction {
  action?: (
    actions: Readonly<{
      close: () => void
      setAction: Setter<MutableMessageAction>
      // setMessage: Setter<MutableMessage>
    }>,
  ) => void
  actionToClose?: boolean
  type: 'click'
}

export interface Message {
  actions?: MessageAction[]
  /**
   * Close when clicked
   */
  clickToClose?: boolean
  closeHook?: (close: () => void) => (() => void) | void
  id: string | number
  message: string
  title?: string
  tone?: ToastTone
}

export type ToastTone = 'error' | 'notification'

export interface ToastInput {
  readonly message: string
  readonly tone?: ToastTone
}

export interface ToastContextValue {
  registerDismiss: (id: string | number, request: () => void) => () => void
  setMessage: (message: Message) => void
  turnOffMessage: (id: string | number) => void
  showToast: (input: ToastInput) => string | null
  dismissToast: (id: string | number) => void
}

export interface ToastInnerContextValue {
  messages: Accessor<Map<string | number, Message>>
  visible: Accessor<ReadonlyArray<Message>>
  count: Accessor<number>
  waitingCount: Accessor<number>
}

export interface ToastContentContextValue {
  message: Message
}

export type ToastActionsContextValue =
  | {
      actions?: MessageAction[]
      id: string | number
    }
  | undefined

export type ToastActionContextValue = MessageAction & {
  onClose?: () => void
}

export const ToastContext = createContext<ToastContextValue>({
  dismissToast: () => undefined,
  registerDismiss: () => () => undefined,
  setMessage: () => {
    //
  },
  showToast: () => {
    throw new Error('showToast must be used inside ToastProvider.')
  },
  turnOffMessage: () => {
    //
  },
})

export const ToastInnerContext = createContext<ToastInnerContextValue>({
  count: () => 0,
  messages: () => new Map(),
  visible: () => [],
  waitingCount: () => 0,
})

export const ToastContentContext = createContext<ToastContentContextValue>({
  message: {
    id: '',
    message: '',
  },
})

export const ToastActionsContext = createContext<ToastActionsContextValue>()

export const ToastActionContext = createContext<ToastActionContextValue>({
  action: () => {
    //
  },
  label: '',
  type: 'click',
})
