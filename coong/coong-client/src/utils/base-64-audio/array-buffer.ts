export const arrayBuffer = (base64: string) => {
  const decoded = window.atob(base64)
  const len = decoded.length
  const bytes = new Uint8Array(len)
  for (let index = 0; index < len; index += 1) {
    // must be number
    bytes[index] = decoded.codePointAt(index) as unknown as number
  }
  return bytes.buffer
}
