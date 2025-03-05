import {Accessor, ComponentProps, For, JSX, useContext} from 'solid-js'
import {Message, NotificationContext, NotificationInnerContext} from './context'
import {Portal} from 'solid-js/web'
import {Close} from 'src/close'

export interface ToastBodyProps extends Omit<ComponentProps<'div'>, 'children'> {
  children: (message: Message, index: Accessor<number>) => JSX.Element
}

export const ToastBody = (props: ToastBodyProps) => {
  const {messages} = useContext(NotificationInnerContext)
  const {turnOffMessage} = useContext(NotificationContext)

  return (
    <Portal>
      <div {...props}>
        <For each={[...messages().values()]}>
          {(message, index) => {
            // The reason show is always true is because the message is not rendered when it's deleted.
            return (
              <Close.Provider show={true} onShowChange={() => turnOffMessage(message.id)}>
                {props.children(message, index)}
              </Close.Provider>
            )
          }}
        </For>
      </div>
    </Portal>
  )
}
