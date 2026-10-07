import {and, eq, isNull} from 'drizzle-orm'
import {cloudTextRequests, pomoUsers, withTransactionalDatabase} from 'src/server/database'
import {getCloudTextDay} from '../day'

interface ResetUserCloudTextUsageOptions {
  readonly now?: Date
  readonly userId: string
}

/** Resets today's charged requests while retaining results, reservations, and daily limits. */
export const resetUserCloudTextUsage = (
  options: ResetUserCloudTextUsageOptions,
): Promise<boolean> =>
  withTransactionalDatabase((database) =>
    database.transaction(async (transaction) => {
      const [user] = await transaction
        .select({id: pomoUsers.id})
        .from(pomoUsers)
        .where(and(eq(pomoUsers.id, options.userId), isNull(pomoUsers.deletedAt)))
        .for('update')
      if (user === undefined) {
        return false
      }
      const now = options.now ?? new Date()
      await transaction
        .update(cloudTextRequests)
        .set({usageResetAt: now})
        .where(
          and(
            eq(cloudTextRequests.userId, options.userId),
            eq(cloudTextRequests.day, getCloudTextDay(now).day),
            isNull(cloudTextRequests.usageResetAt),
          ),
        )
      return true
    }),
  )
