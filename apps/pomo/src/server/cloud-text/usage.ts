import {and, eq, gt, isNotNull, isNull, or} from 'drizzle-orm'
import {CLOUD_TEXT_DAILY_LIMIT, type CloudTextUsage} from 'src/features/cloud-text/contracts'
import {cloudTextRequests} from '../database'
import {getCloudTextDay} from './day'

/** Matches completed generations and reservations still owning their daily slot. */
export const getCloudTextUsageCondition = (now: Date) =>
  and(
    eq(cloudTextRequests.day, getCloudTextDay(now).day),
    isNull(cloudTextRequests.usageResetAt),
    or(
      eq(cloudTextRequests.status, 'complete'),
      and(
        eq(cloudTextRequests.status, 'pending'),
        or(gt(cloudTextRequests.expiresAt, now), isNotNull(cloudTextRequests.queueJobId)),
      ),
    ),
  )

/** Builds the current daily allowance including pending generations. */
export const createCloudTextUsage = (
  used: number,
  now: Date,
  limit: number | null = CLOUD_TEXT_DAILY_LIMIT,
): CloudTextUsage => {
  const daily = {...getCloudTextDay(now), used}
  return limit === null
    ? {...daily, limit: null, remaining: null}
    : {...daily, limit, remaining: Math.max(0, limit - used)}
}
