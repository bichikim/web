import {and, eq, gt, inArray, isNull, lte, or} from 'drizzle-orm'
import {
  cloudTextLimits,
  cloudTextProductLimits,
  commerceEntitlementGrants,
  type Database,
} from 'src/server/database'
import {resolveCloudTextLimit} from './resolve-limit'

export interface UserCloudTextLimit {
  readonly limit: number | null
  readonly override: number | 'unlimited' | null
}

/** Reads effective limits from administrator overrides and currently valid configured product grants. */
export const readUserCloudTextLimits = async (
  database: Pick<Database, 'select'>,
  userIds: ReadonlyArray<string>,
  now: Date,
): Promise<ReadonlyMap<string, UserCloudTextLimit>> => {
  if (userIds.length === 0) {
    return new Map()
  }
  const [overrides, grants] = await Promise.all([
    database
      .select({limit: cloudTextLimits.dailyLimit, userId: cloudTextLimits.userId})
      .from(cloudTextLimits)
      .where(inArray(cloudTextLimits.userId, userIds)),
    database
      .select({limit: cloudTextProductLimits.dailyLimit, userId: commerceEntitlementGrants.userId})
      .from(commerceEntitlementGrants)
      .innerJoin(
        cloudTextProductLimits,
        eq(cloudTextProductLimits.productId, commerceEntitlementGrants.productId),
      )
      .where(
        and(
          inArray(commerceEntitlementGrants.userId, userIds),
          isNull(commerceEntitlementGrants.revokedAt),
          lte(commerceEntitlementGrants.startsAt, now),
          or(isNull(commerceEntitlementGrants.endsAt), gt(commerceEntitlementGrants.endsAt, now)),
        ),
      ),
  ])
  const overridesByUser = new Map(overrides.map((entry) => [entry.userId, entry.limit]))
  const limitsByUser = Map.groupBy(grants, (entry) => entry.userId)
  return new Map(
    userIds.map((userId) => {
      const override = overridesByUser.get(userId)
      const productLimits = (limitsByUser.get(userId) ?? []).map((entry) => entry.limit)
      return [
        userId,
        {
          limit: resolveCloudTextLimit({override, productLimits}),
          override: override === undefined ? null : override === null ? 'unlimited' : override,
        },
      ]
    }),
  )
}
