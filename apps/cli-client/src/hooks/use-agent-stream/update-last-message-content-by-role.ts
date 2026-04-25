import {updateLastItemWhen} from '@/utils/update-last-item-when'

export const updateLastMessageContentByRole = <Message extends {content: string; role: string}>(
  previous: Message[],
  role: string,
  content: string,
): Message[] =>
  updateLastItemWhen(
    previous,
    (message) => message.role === role,
    (message) => ({...message, content}),
  )
