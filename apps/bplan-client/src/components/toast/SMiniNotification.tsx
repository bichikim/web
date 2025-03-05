import {NotificationInnerContext} from '@winter-love/solid-components'
import {createMemo, useContext} from 'solid-js'

export const SMiniNotification = () => {
  const {messages} = useContext(NotificationInnerContext)

  const messageCount = createMemo(() => {
    return messages().size
  })

  const lastMessage = createMemo(() => {
    return [...messages().values()].pop()?.message
  })

  return (
    <div>
      {messageCount()}
      {lastMessage()}
    </div>
  )
}
