export const browserWakeLock = {
  isSupported: () => 'wakeLock' in navigator && typeof navigator.wakeLock.request === 'function',
  isVisible: () => document.visibilityState === 'visible',
  request: () => navigator.wakeLock.request('screen'),
  subscribeVisibility: (onChange: () => void) => {
    document.addEventListener('visibilitychange', onChange)
    return () => document.removeEventListener('visibilitychange', onChange)
  },
}
