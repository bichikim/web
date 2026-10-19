import {and, count, eq, gt, inArray, isNull} from 'drizzle-orm'
import type {AdminCloudTextPage, AdminCloudTextQuery} from 'src/features/admin-cloud-text/contracts'
import {cloudTextRequests, getDatabase, pomoIdentities, pomoUsers} from 'src/server/database'
import {createCloudTextUsage, getCloudTextUsageCondition} from '../usage'
import {readUserCloudTextLimits} from '../read-user-limits'

const PAGE_SIZE = 30

/** Lists active accounts and their current shared allowance with stable cursor pagination. */
export const listAdminCloudTextUsers = async (
  options: AdminCloudTextQuery,
): Promise<AdminCloudTextPage> => {
  const database = getDatabase()
  const now = new Date()
  const entries = await database
    .select({
      createdAt: pomoUsers.createdAt,
      id: pomoUsers.id,
    })
    .from(pomoUsers)
    .where(
      and(
        isNull(pomoUsers.deletedAt),
        options.cursor === undefined ? undefined : gt(pomoUsers.id, options.cursor),
        options.userId === undefined ? undefined : eq(pomoUsers.id, options.userId),
      ),
    )
    .orderBy(pomoUsers.id)
    .limit(PAGE_SIZE + 1)
  const users = entries.slice(0, PAGE_SIZE)
  if (users.length === 0) {
    return {nextCursor: null, users: []}
  }
  const userIds = users.map((user) => user.id)
  const [usage, identities, limits] = await Promise.all([
    database
      .select({used: count(), userId: cloudTextRequests.userId})
      .from(cloudTextRequests)
      .where(and(inArray(cloudTextRequests.userId, userIds), getCloudTextUsageCondition(now)))
      .groupBy(cloudTextRequests.userId),
    database
      .select({provider: pomoIdentities.provider, userId: pomoIdentities.userId})
      .from(pomoIdentities)
      .where(inArray(pomoIdentities.userId, userIds)),
    readUserCloudTextLimits(database, userIds, now),
  ])
  const counts = new Map(usage.map((entry) => [entry.userId, entry.used]))
  return {
    nextCursor: entries.length > PAGE_SIZE ? (users.at(-1)?.id ?? null) : null,
    users: users.map((user) => ({
      createdAt: user.createdAt.toISOString(),
      dailyLimitOverride: limits.get(user.id)?.override ?? null,
      id: user.id,
      providers: identities
        .filter((identity) => identity.userId === user.id)
        .map((identity) => identity.provider),
      usage: createCloudTextUsage(counts.get(user.id) ?? 0, now, limits.get(user.id)?.limit),
    })),
  }
}
