import 'server-only'

import {and, sql} from 'drizzle-orm'

import {type Database, getDatabase, weatherProviderUsage} from '../database'

export const OPENWEATHER_MONTHLY_REQUEST_LIMIT = 90_000
export const OPENWEATHER_MONTHLY_CURRENT_LIMIT = 70_000
export const OPENWEATHER_MONTHLY_SEARCH_LIMIT = 20_000
export const OPENWEATHER_PER_MINUTE_REQUEST_LIMIT = 30
const BILLING_MONTH_LENGTH = 7
const RATE_WINDOW_MINUTE_LENGTH = 16

export type OpenWeatherRequestKind = 'current' | 'search'

export class OpenWeatherQuotaError extends Error {
  constructor(readonly kind: OpenWeatherRequestKind) {
    super(`OpenWeather ${kind} request budget is exhausted`)
    this.name = 'OpenWeatherQuotaError'
  }
}

const getBillingMonth = (now: Date): string => now.toISOString().slice(0, BILLING_MONTH_LENGTH)

const getRateWindowMinute = (now: Date): string =>
  now.toISOString().slice(0, RATE_WINDOW_MINUTE_LENGTH)

/** Atomically reserves one provider request below the product-owned rate and monthly budgets. */
export const reserveOpenWeatherRequest = async (
  kind: OpenWeatherRequestKind,
  now = new Date(),
  database: Database = getDatabase(),
): Promise<void> => {
  const currentIncrement = kind === 'current' ? 1 : 0
  const searchIncrement = kind === 'search' ? 1 : 0
  const rateWindowMinute = getRateWindowMinute(now)
  const kindBudgetCondition =
    kind === 'current'
      ? sql`${weatherProviderUsage.currentRequests} < ${OPENWEATHER_MONTHLY_CURRENT_LIMIT}`
      : sql`${weatherProviderUsage.searchRequests} < ${OPENWEATHER_MONTHLY_SEARCH_LIMIT}`
  const [usage] = await database
    .insert(weatherProviderUsage)
    .values({
      billingMonth: getBillingMonth(now),
      currentRequests: currentIncrement,
      rateRequests: 1,
      rateWindowMinute,
      searchRequests: searchIncrement,
    })
    .onConflictDoUpdate({
      set: {
        currentRequests: sql`${weatherProviderUsage.currentRequests} + ${currentIncrement}`,
        rateRequests: sql`case
          when ${weatherProviderUsage.rateWindowMinute} = ${rateWindowMinute}
            then ${weatherProviderUsage.rateRequests} + 1
          else 1
        end`,
        rateWindowMinute,
        searchRequests: sql`${weatherProviderUsage.searchRequests} + ${searchIncrement}`,
        updatedAt: sql`now()`,
      },
      setWhere: and(
        sql`${weatherProviderUsage.currentRequests} + ${weatherProviderUsage.searchRequests}
          < ${OPENWEATHER_MONTHLY_REQUEST_LIMIT}`,
        kindBudgetCondition,
        sql`(${weatherProviderUsage.rateWindowMinute} <> ${rateWindowMinute}
          or ${weatherProviderUsage.rateRequests} < ${OPENWEATHER_PER_MINUTE_REQUEST_LIMIT})`,
      ),
      target: weatherProviderUsage.billingMonth,
    })
    .returning({billingMonth: weatherProviderUsage.billingMonth})

  if (usage === undefined) {
    throw new OpenWeatherQuotaError(kind)
  }
}
