import {clientOnly} from '@solidjs/start'

export const ChatWorkspace = clientOnly(
  async () => {
    const {ChatRoom} = await import('src/components/ChatRoom')
    return {default: ChatRoom}
  },
  {lazy: true},
)
