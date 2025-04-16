export const getSelfUrl = () => {
  // find env and use for client case and ssr case
  const urlFromEnv = import.meta.env.VITE_API_URL

  if (urlFromEnv) {
    return urlFromEnv
  }

  // in client case, window exists
  if (typeof window !== 'undefined') {
    return window.location.origin
  }

  // ssr case
  const defaultPort = 3000
  const port = process.env.PORT ?? defaultPort

  return `http://localhost:${port}`
}

/**
 * get database url
 * to setting or get database url visit https://vercel.com/bichis-projects/web/settings/environment-variables
 */
export const getDatabaseUrl = (): string => {
  const url = import.meta.env.DATABASE_URL ?? process.env.DATABASE_URL

  // Throw an error to prevent execution when values (url) are missing
  if (typeof url !== 'string') {
    throw new TypeError('DATABASE_URL is not set')
  }

  return url
}

/**
 * get github client id and secret
 * to setting or get client id and secret visit https://github.com/settings/applications/new (account: bichikim)
 */
export const getGithubClient = () => {
  const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID
  const clientSecret = import.meta.env.VITE_GITHUB_CLIENT_SECRET

  // Throw an error to prevent execution when values (clientId, clientSecret) are missing
  if (typeof clientId !== 'string' || typeof clientSecret !== 'string') {
    throw new TypeError('GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET is not set')
  }

  return {clientId, clientSecret}
}
