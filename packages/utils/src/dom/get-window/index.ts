export const getWindow = (): Window | undefined => {
  if (typeof window === 'undefined') {
    return
  }
  return window
}
