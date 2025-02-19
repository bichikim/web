export const getSelfUrl = () => {
  return import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
}

export const getDatabaseUrl = (): string => {
  const url = import.meta.env.VITE_DATABASE_URL

  if (!url) {
    throw new Error('DATABASE_URL is not set')
  }

  return url
}

export const getGithubClient = () => {
  const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID
  const clientSecret = import.meta.env.VITE_GITHUB_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET is not set')
  }

  return {clientId, clientSecret}
}
