/**
 * Generic database URL (`DATABASE_URL`).
 * To configure it on Vercel: https://vercel.com/bichis-projects/web/settings/environment-variables
 */
export const getDatabaseUrl = (): string => {
  const url = import.meta.env.DATABASE_URL ?? process.env.DATABASE_URL

  if (typeof url !== 'string') {
    throw new TypeError('DATABASE_URL is not set')
  }

  return url
}

/** Postgres connection string from `POSTGRES_URL` (e.g. `postgres` driver). */
export const getPostgresUrl = (): string => {
  const url = import.meta.env.POSTGRES_URL ?? process.env.POSTGRES_URL

  if (typeof url !== 'string') {
    throw new TypeError('POSTGRES_URL is not set')
  }

  return url
}
