import {sql} from 'drizzle-orm'
import {
  check,
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
