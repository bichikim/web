export const isElement = (value: any): value is Element => {
  const {HTMLElement} = globalThis.window ?? {}
  if (!HTMLElement) {
    return false
  }
  return value instanceof HTMLElement
}
