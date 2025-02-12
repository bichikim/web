const MESSAGE_TYPE = 'iframe-message'

export const getMessage = (data: any) => {
  if (typeof data === 'object' && data.type === MESSAGE_TYPE) {
    return data.message
  }
}

export const createMessage = (message: string) => ({
  message,
  type: MESSAGE_TYPE,
})
