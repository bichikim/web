import {sql} from 'drizzle-orm'
import {
  check,
  doublePrecision,
  integer,
  pgEnum,
  pgTable,
  real,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

export const weatherPrecipitationEnum = pgEnum('weather_precipitation', [
  'none',
  'rain',
  'mixed',
  'snow',
])

export const weatherSkyEnum = pgEnum('weather_sky', ['clear', 'cloudy', 'overcast'])

export const weatherLocations = pgTable(
  'weather_locations',
  {
    country: varchar({length: 128}).notNull(),
    createdAt: timestamp({withTimezone: true}).notNull().defaultNow(),
    id: varchar({length: 64}).primaryKey(),
    latitude: doublePrecision().notNull(),
    longitude: doublePrecision().notNull(),
    name: varchar({length: 128}).notNull(),
    providerLocationId: varchar({length: 64}).notNull(),
    region: varchar({length: 128}).notNull(),
    updatedAt: timestamp({withTimezone: true}).notNull().defaultNow(),
  },
  (table) => [
    check('weather_locations_latitude_range', sql`${table.latitude} between -90 and 90`),
    check('weather_locations_longitude_range', sql`${table.longitude} between -180 and 180`),
    uniqueIndex('weather_locations_provider_id_index').on(table.providerLocationId),
  ],
)

export const weatherProviderUsage = pgTable(
  'weather_provider_usage',
  {
    billingMonth: varchar({length: 7}).primaryKey(),
    currentRequests: integer().notNull().default(0),
    rateRequests: integer().notNull().default(0),
    rateWindowMinute: varchar({length: 16}).notNull(),
    searchRequests: integer().notNull().default(0),
    updatedAt: timestamp({withTimezone: true}).notNull().defaultNow(),
  },
  (table) => [
    check(
      'weather_provider_usage_month_format',
      sql`${table.billingMonth} ~ '^[0-9]{4}-[0-9]{2}$'`,
    ),
    check(
      'weather_provider_usage_requests_nonnegative',
      sql`${table.currentRequests} >= 0 and ${table.rateRequests} >= 0 and ${table.searchRequests} >= 0`,
    ),
    check(
      'weather_provider_usage_rate_window_format',
      sql`${table.rateWindowMinute} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}$'`,
    ),
  ],
)

export const weather = pgTable(
  'weather',
  {
    collectedAt: timestamp({withTimezone: true}).notNull().defaultNow(),
    humidityPercent: real(),
    id: uuid().primaryKey().defaultRandom(),
    location: varchar({length: 64}).notNull(),
    precipitation: weatherPrecipitationEnum().notNull(),
    precipitationMillimeters: real(),
    sky: weatherSkyEnum(),
    temperatureCelsius: real(),
    weatherAt: timestamp({withTimezone: true}).notNull(),
    windSpeedMetersPerSecond: real(),
  },
  (table) => [uniqueIndex('weather_location_time_index').on(table.location, table.weatherAt)],
)

export const weatherCollectionState = pgTable(
  'weather_collection_state',
  {
    consecutiveFailures: integer().notNull().default(0),
    lastAttemptedAt: timestamp({withTimezone: true}).notNull(),
    lastFailedAt: timestamp({withTimezone: true}),
    leaseExpiresAt: timestamp({withTimezone: true}),
    leaseKey: varchar({length: 255}),
    leaseToken: uuid(),
    location: varchar({length: 64}).primaryKey(),
    retryAfter: timestamp({withTimezone: true}),
  },
  (table) => [
    check('weather_collection_state_failures_nonnegative', sql`${table.consecutiveFailures} >= 0`),
    check(
      'weather_collection_state_lease_complete',
      sql`(${table.leaseExpiresAt} is null and ${table.leaseKey} is null and ${
        table.leaseToken
      } is null) or (${table.leaseExpiresAt} is not null and ${table.leaseKey} is not null and ${
        table.leaseToken
      } is not null)`,
    ),
  ],
)
