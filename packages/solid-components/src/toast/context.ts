import {Accessor, createContext} from 'solid-js'

export const createTimeout = (timeout: number) => {
  return (callback: () => void) => {
    setTimeout(() => {
      callback()
    }, timeout)
  }
}

export interface MessageAction {
  action: () => void
  actionToClose?: boolean
  label: string
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
}

export interface NotificationContextValue {
  setMessage: (message: Message) => void
  turnOffMessage: (id: string | number) => void
}

export interface NotificationInnerContextValue {
  messages: Accessor<Map<string | number, Message>>
}

export const NotificationContext = createContext<NotificationContextValue>({
  setMessage: () => {
    //
  },
  turnOffMessage: () => {
    //
  },
})

export const NotificationInnerContext = createContext<NotificationInnerContextValue>({
  messages: () => new Map(),
})
