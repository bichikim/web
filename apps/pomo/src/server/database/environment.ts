import {readOptionalString, readString, readUrl} from '../environment/schema'

export interface DatabaseEnvironment {
  readonly DATABASE_URL?: string
  readonly DATABASE_URL_UNPOOLED?: string
}

const parseDatabaseUrl = (value: string | undefined, name: string): string => {
  const normalizedValue = readString(name, value)
  readUrl(name, normalizedValue, {protocols: ['postgres:', 'postgresql:']})
  return normalizedValue
}

/** Returns the pooled Neon URL used by application queries. */
export const getDatabaseUrl = (environment: DatabaseEnvironment = process.env): string =>
  parseDatabaseUrl(environment.DATABASE_URL, 'DATABASE_URL')

/** Returns the direct Neon URL used by schema migrations. */
export const getMigrationDatabaseUrl = (environment: DatabaseEnvironment = process.env): string => {
  if (readOptionalString(environment.DATABASE_URL_UNPOOLED)) {
    return parseDatabaseUrl(environment.DATABASE_URL_UNPOOLED, 'DATABASE_URL_UNPOOLED')
  }

  return parseDatabaseUrl(environment.DATABASE_URL, 'DATABASE_URL')
}
