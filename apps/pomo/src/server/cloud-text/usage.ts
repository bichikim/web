import {and, eq, gt, inArray, isNotNull, isNull, or} from 'drizzle-orm'
import {CLOUD_TEXT_DAILY_LIMIT, type CloudTextUsage} from 'src/features/cloud-text/contracts'
import {cloudTextRequests} from '../database/schema/cloud-text'
import {getCloudTextDay} from './day'

/** 완료된 생성, 차감된 취소, 유효한 예약을 일일 사용량에 포함한다. */
export const getCloudTextUsageCondition = (now: Date) =>
  and(
    eq(cloudTextRequests.day, getCloudTextDay(now).day),
    isNull(cloudTextRequests.usageResetAt),
    or(
      inArray(cloudTextRequests.status, ['complete', 'cancelled']),
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
