export const getWindow = (): Window | null => {
  if (typeof window === 'undefined') {
    return null
  }

  return window
}
