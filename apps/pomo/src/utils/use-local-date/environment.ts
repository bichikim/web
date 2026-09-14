export const dateEnvironment = {
  schedule: (callback: () => void, delay: number): (() => void) => {
    const timer = setTimeout(callback, delay)
    return () => clearTimeout(timer)
  },
  subscribe: (callback: () => void): (() => void) => {
    const target = globalThis.document
    target.addEventListener('visibilitychange', callback)
    return () => target.removeEventListener('visibilitychange', callback)
  },
}
