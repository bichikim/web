import {Accessor, createSignal, For, JSX, ParentProps} from 'solid-js'
import {Message, NotificationContext, NotificationInnerContext} from './context'
import {Portal} from 'solid-js/web'
import {NotificationItem} from './NotificationItem'

export interface NotificationProps extends ParentProps {
  //
}

export const NotificationRoot = (props: NotificationProps) => {
  const [messages, setMessages] = createSignal(new Map<string | number, Message>())

  const turnOffMessage = (id: string | number) => {
    setMessages((prev) => {
      prev.delete(id)

      return new Map(prev)
    })
  }

  const setMessage = (message: Message) => {
    const {id} = message

    setMessages((prev) => {
      prev.set(message.id, message)

      message.timeout(() => {
        turnOffMessage(id)
      })

      return new Map(prev)
    })
  }

  return (
    <NotificationContext.Provider value={{setMessage}}>
      <NotificationInnerContext.Provider value={{messages}}>
        {props.children}
      </NotificationInnerContext.Provider>
    </NotificationContext.Provider>
  )
}
