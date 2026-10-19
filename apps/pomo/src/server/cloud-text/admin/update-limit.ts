import {and, eq, isNull} from 'drizzle-orm'
import type {CloudTextLimitUpdate} from 'src/features/admin-cloud-text/contracts'
import {cloudTextLimits, pomoUsers, withTransactionalDatabase} from 'src/server/database'

interface UpdateUserCloudTextLimitOptions extends CloudTextLimitUpdate {
  readonly userId: string
}

/** Persists an override or restores the default under the same lock used by generation. */
export const updateUserCloudTextLimit = (
  options: UpdateUserCloudTextLimitOptions,
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
      if (options.dailyLimit === null) {
        await transaction.delete(cloudTextLimits).where(eq(cloudTextLimits.userId, options.userId))
      } else {
        const dailyLimit = options.dailyLimit === 'unlimited' ? null : options.dailyLimit
        await transaction
          .insert(cloudTextLimits)
          .values({dailyLimit, userId: options.userId})
          .onConflictDoUpdate({
            set: {dailyLimit, updatedAt: new Date()},
            target: cloudTextLimits.userId,
          })
      }
      return true
    }),
  )
