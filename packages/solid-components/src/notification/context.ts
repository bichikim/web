import {createContext, Accessor} from 'solid-js'

export const createTimeout = (timeout: number) => {
  return (callback: () => void) => {
    setTimeout(() => {
      callback()
    }, timeout)
  }
}

export interface MessageAction {
  action: () => void
  label: string
  type: 'click'
}

export interface Message {
  actions: MessageAction[]
  id: string | number
  message: string
  timeout: (callback: () => void) => void
}

export interface NotificationContextValue {
  setMessage: (message: Message) => void
}

export interface NotificationInnerContextValue {
  messages: Accessor<Map<string | number, Message>>
}

export const NotificationContext = createContext<NotificationContextValue>({
  setMessage: () => {
    //
  },
})

export const NotificationInnerContext = createContext<NotificationInnerContextValue>({
  messages: () => new Map(),
})
