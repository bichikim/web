import {drizzle as drizzleHttp} from 'drizzle-orm/neon-http'
import {drizzle as drizzleServerless} from 'drizzle-orm/neon-serverless'
import {getDatabaseUrl} from './environment'
import * as schema from './schema'

export * from './schema'

const createDatabase = (connectionString: string) =>
  drizzleHttp(connectionString, {
    casing: 'snake_case',
    schema,
  })

const createTransactionalDatabase = (connectionString: string) =>
  drizzleServerless(connectionString, {
    casing: 'snake_case',
    schema,
  })

export type Database = ReturnType<typeof createDatabase>
export type TransactionalDatabase = ReturnType<typeof createTransactionalDatabase>

let database: Database | undefined
let transactionalDatabase: TransactionalDatabase | undefined

/** Returns the lazily initialized Neon HTTP database client. */
export const getDatabase = (): Database => {
  database ??= createDatabase(getDatabaseUrl())

  return database
}

/** Returns the pooled Neon client reserved for atomic write workflows. */
export const getTransactionalDatabase = (): TransactionalDatabase => {
  // AI_NOTE - Keep ordinary feed reads on Neon HTTP; the pooled driver is only needed because neon-http cannot run interactive transactions.
  transactionalDatabase ??= createTransactionalDatabase(getDatabaseUrl())

  return transactionalDatabase
}
