export const getSelfUrl = () => {
  const urlFromEnv = import.meta.env.VITE_API_URL

  if (urlFromEnv) {
    return urlFromEnv
  }

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

  if (!url) {
    throw new Error('DATABASE_URL is not set')
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

  if (!clientId || !clientSecret) {
    throw new Error('GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET is not set')
  }

  return {clientId, clientSecret}
}
