export interface DatabaseEnvironment {
  readonly DATABASE_URL?: string
  readonly DATABASE_URL_UNPOOLED?: string
}

const parseDatabaseUrl = (value: string | undefined, name: string): string => {
  const normalizedValue = value?.trim()

  if (!normalizedValue) {
    throw new TypeError(`${name} is not set`)
  }

  let url: URL

  try {
    url = new URL(normalizedValue)
  } catch (cause) {
    throw new TypeError(`${name} must be a valid URL`, {cause})
  }

  if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') {
    throw new TypeError(`${name} must use the postgres or postgresql protocol`)
  }

  return normalizedValue
}

/** Returns the pooled Neon URL used by application queries. */
export const getDatabaseUrl = (environment: DatabaseEnvironment = process.env): string =>
  parseDatabaseUrl(environment.DATABASE_URL, 'DATABASE_URL')

/** Returns the direct Neon URL used by schema migrations. */
export const getMigrationDatabaseUrl = (environment: DatabaseEnvironment = process.env): string => {
  if (environment.DATABASE_URL_UNPOOLED?.trim()) {
    return parseDatabaseUrl(environment.DATABASE_URL_UNPOOLED, 'DATABASE_URL_UNPOOLED')
  }

  return parseDatabaseUrl(environment.DATABASE_URL, 'DATABASE_URL')
}
