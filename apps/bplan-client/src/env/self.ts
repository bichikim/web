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
