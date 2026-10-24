/* eslint-disable no-bitwise, no-magic-numbers -- Base64 encodes fixed-width bytes. */
const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

/** 바이트를 브라우저와 Node에서 같은 Base64 문자열로 인코딩한다. */
export const encodeBase64 = (bytes: Uint8Array): string => {
  const output: string[] = []
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index]!
    const second = bytes[index + 1]
    const third = bytes[index + 2]
    output.push(
      BASE64_ALPHABET[first >> 2]!,
      BASE64_ALPHABET[((first & 3) << 4) | ((second ?? 0) >> 4)]!,
      second === undefined ? '=' : BASE64_ALPHABET[((second & 15) << 2) | ((third ?? 0) >> 6)]!,
      third === undefined ? '=' : BASE64_ALPHABET[third & 63]!,
    )
  }
  return output.join('')
}
