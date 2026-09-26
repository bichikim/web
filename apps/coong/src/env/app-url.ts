export const getSelfUrl = () => {
  // find env and use for client case and ssr case
  const urlFromEnv = import.meta.env.DEV ? undefined : import.meta.env.VITE_APP_URL

  if (urlFromEnv) {
    return urlFromEnv
  }

  // in client case, window exists
  if (typeof globalThis.window !== 'undefined') {
    return globalThis.location.origin
  }

  // ssr case
  const defaultPort = 3000
  const port = process.env.PORT ?? defaultPort

  return `http://localhost:${port}`
}
