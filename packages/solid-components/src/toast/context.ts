import {Accessor, createContext} from 'solid-js'

export const createTimeout = (timeout: number) => {
  return (callback: () => void) => {
    setTimeout(() => {
      callback()
    }, timeout)
  }
}

export interface MessageAction {
  action?: () => void
  actionToClose?: boolean
  label: string
  props?: Record<string, any>
  type: 'click'
}

export interface Message {
  actions?: MessageAction[]
  /**
   * Close when clicked
   */
  clickToClose?: boolean
  closeHook?: (close: () => void) => void
  id: string | number
  message: string
  title?: string
}

export interface ToastContextValue {
  setMessage: (message: Message) => void
  turnOffMessage: (id: string | number) => void
}

export interface ToastInnerContextValue {
  messages: Accessor<Map<string | number, Message>>
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
  setMessage: () => {
    //
  },
  turnOffMessage: () => {
    //
  },
})

export const ToastInnerContext = createContext<ToastInnerContextValue>({
  messages: () => new Map(),
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
