export const updateMessageContentById = <Message extends {content: string; id: string}>(
  previous: Message[],
  messageId: string,
  content: string,
): Message[] =>
  previous.map((message) => (message.id === messageId ? {...message, content} : message))
