export interface Blockchain {
  generateMessage: (nonce: string) => string
  pickNonce: (message: string) => string
}

export const createBlockchain = (signMessage: string): Blockchain => {
  const splitKey = '>>>'
  const generateMessage = (nonce: string) => {
    return `${signMessage} ${splitKey}${nonce}`
  }

  const pickNonce = (massage: string) => {
    return massage.split(splitKey)[1]
  }

  return {
    generateMessage,
    pickNonce,
  }
}
