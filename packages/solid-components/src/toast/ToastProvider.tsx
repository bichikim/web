import {createSignal, ParentProps} from 'solid-js'
import {Message, NotificationContext, NotificationInnerContext} from './context'

export interface ToastProviderProps extends ParentProps {
  //
}

export const ToastProvider = (props: ToastProviderProps) => {
  const [messages, setMessages] = createSignal(new Map<string | number, Message>())

  const turnOffMessage = (id: string | number) => {
    setMessages((prev) => {
      prev.delete(id)

      return new Map(prev)
    })
  }

  const setMessage = (message: Message) => {
    setMessages((prev) => {
      const {id} = message

      prev.set(id, message)

      message.closeHook?.(() => {
        turnOffMessage(id)
      })

      return new Map(prev)
    })
  }

  return (
    <NotificationContext.Provider value={{setMessage, turnOffMessage}}>
      <NotificationInnerContext.Provider value={{messages}}>
        {props.children}
      </NotificationInnerContext.Provider>
    </NotificationContext.Provider>
  )
}
