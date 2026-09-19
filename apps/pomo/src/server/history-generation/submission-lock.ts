import {sql} from 'drizzle-orm'

import {withTransactionalDatabase} from '../database'

const LOCK_NAMESPACE = 'history-generation'

/** Serializes history generation submissions for one target date across app instances. */
export const withHistoryGenerationLock = async <Result>(
  targetDate: string,
  operation: () => Promise<Result>,
): Promise<Result> =>
  withTransactionalDatabase((database) =>
    database.transaction(async (transaction) => {
      await transaction.execute(
        sql`select pg_advisory_xact_lock(hashtext(${LOCK_NAMESPACE}), hashtext(${targetDate}))`,
      )

      return operation()
    }),
  )
