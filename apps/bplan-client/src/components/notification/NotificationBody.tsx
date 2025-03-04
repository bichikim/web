import {Accessor, ComponentProps, For, JSX, useContext} from 'solid-js'
import {Message, NotificationInnerContext} from './context'
import {Portal} from 'solid-js/web'

export interface NotificationBodyProps extends Omit<ComponentProps<'div'>, 'children'> {
  children: (message: Message, index: Accessor<number>) => JSX.Element
}

export const NotificationBody = (props: NotificationBodyProps) => {
  const {messages} = useContext(NotificationInnerContext)

  return (
    <Portal>
      <div {...props}>
        <For each={[...messages().values()]}>{props.children}</For>
      </div>
    </Portal>
  )
}
