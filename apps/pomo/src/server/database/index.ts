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

/** Returns the lazily initialized Neon HTTP database client. */
export const getDatabase = (): Database => {
  database ??= createDatabase(getDatabaseUrl())

  return database
}

/** Runs an atomic write workflow with a request-scoped Neon WebSocket pool. */
export const withTransactionalDatabase = async <Result>(
  operation: (database: TransactionalDatabase) => Promise<Result>,
): Promise<Result> => {
  // AI_NOTE - Keep ordinary feed reads on Neon HTTP; the pooled driver is only needed because neon-http cannot run interactive transactions.
  const transactionalDatabase = createTransactionalDatabase(getDatabaseUrl())
  let result: Result

  try {
    result = await operation(transactionalDatabase)
  } catch (operationError) {
    try {
      await transactionalDatabase.$client.end()
    } catch (closeError) {
      console.error(
        'Failed to close the transactional database after an operation error.',
        closeError,
      )
    }

    throw operationError
  }

  await transactionalDatabase.$client.end()

  return result
}
