export const arrayBuffer = (base64: string) => {
  const decoded = window.atob(base64)
  const {length} = decoded
  const bytes = new Uint8Array(length)
  for (let index = 0; index < length; index += 1) {
    // must be number
    bytes[index] = decoded.codePointAt(index) as unknown as number
  }
  return bytes.buffer
}
