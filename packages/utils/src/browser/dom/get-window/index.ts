export const getWindow = (): Window | null => {
  if (typeof globalThis.window === 'undefined') {
    return null
  }

  return globalThis.window
}
