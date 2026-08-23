import {lazy} from 'solid-js'

const ChatPage = import.meta.env.DEV
  ? lazy(() => import('src/components/dev/ChatPage'))
  : () => null

export default ChatPage
