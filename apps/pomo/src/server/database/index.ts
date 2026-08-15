import {drizzle} from 'drizzle-orm/neon-http'
import {getDatabaseUrl} from './environment'
import * as schema from './schema'

const createDatabase = (connectionString: string) =>
  drizzle(connectionString, {
    casing: 'snake_case',
    schema,
  })

export type Database = ReturnType<typeof createDatabase>

let database: Database | undefined

/** Returns the lazily initialized Neon HTTP database client. */
export const getDatabase = (): Database => {
  database ??= createDatabase(getDatabaseUrl())

  return database
}
