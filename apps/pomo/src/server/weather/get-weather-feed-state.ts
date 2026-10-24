import type {LegacyWeatherFeed, WeatherCitySlug} from 'src/features/weather/contract'

import {type Database, getDatabase} from '../database'
import {getLatestWeather} from '../repositories/weather'
import {createCurrentWeather} from './create-current-weather'
import {
  getKmaObservationTime,
  getLatestKmaAvailabilityTime,
  getSecondsUntilNextKmaAvailability,
  parseKmaDateTime,
} from './kma-time'
import {getWeatherLocation} from './locations'

const MILLISECONDS_PER_SECOND = 1_000

interface CurrentWeatherFeedState {
  readonly feed: LegacyWeatherFeed
  readonly status: 'current'
}

interface MissingWeatherFeedState {
  readonly status: 'missing'
}

interface OutdatedWeatherFeedState {
  readonly feed: LegacyWeatherFeed
  readonly status: 'outdated'
}

export type WeatherFeedState =
  | CurrentWeatherFeedState
  | MissingWeatherFeedState
  | OutdatedWeatherFeedState

type WeatherRecord = NonNullable<Awaited<ReturnType<typeof getLatestWeather>>>

interface CreateWeatherFeedOptions {
  readonly location: WeatherCitySlug
  readonly now: Date
  readonly record: WeatherRecord
  readonly stale: boolean
}

const createWeatherFeed = (options: CreateWeatherFeedOptions): LegacyWeatherFeed => {
  const expiresAt = new Date(
    options.now.getTime() +
      getSecondsUntilNextKmaAvailability(options.now) * MILLISECONDS_PER_SECOND,
  )
  const location = getWeatherLocation(options.location)

  return {
    city: {label: location.label, slug: location.slug},
    current: createCurrentWeather(options.record),
    expiresAt: expiresAt.toISOString(),
    observedAt: options.record.weatherAt.toISOString(),
    schemaVersion: 1,
    source: {
      name: '기상청',
      url: 'https://www.data.go.kr/data/15084084/openapi.do',
    },
    stale: options.stale,
    updatedAt: options.record.collectedAt.toISOString(),
  }
}

const isWeatherCurrent = (record: WeatherRecord, now: Date): boolean => {
  const observationTime = getKmaObservationTime(now)
  const requiredWeatherAt = parseKmaDateTime(observationTime.date, observationTime.time)
  const requiredCollectedAt = getLatestKmaAvailabilityTime(now)

  return (
    record.weatherAt.getTime() >= requiredWeatherAt.getTime() &&
    record.collectedAt.getTime() >= requiredCollectedAt.getTime()
  )
}

/** Reads the stored KMA row and reports whether the public feed is current. */
export const getWeatherFeedState = async (
  location: WeatherCitySlug,
  now = new Date(),
  database: Database = getDatabase(),
): Promise<WeatherFeedState> => {
  const record = await getLatestWeather(location, database)

  if (record === undefined) {
    return {status: 'missing'}
  }

  const isCurrent = isWeatherCurrent(record, now)
  const feed = createWeatherFeed({location, now, record, stale: !isCurrent})

  return {feed, status: isCurrent ? 'current' : 'outdated'}
}
