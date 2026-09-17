import {type WeatherFeed, type WeatherLocationId} from 'src/features/weather'

import {type Database, getDatabase} from '../database'
import {getLatestWeather, type WeatherTransaction} from '../repositories/weather'
import {runWeatherCollection, type WeatherCollectionResult} from './collection-orchestrator'
import {createCurrentWeather} from './create-current-weather'
import {fetchOpenWeatherCurrent} from './openweather-client'
import {reserveOpenWeatherRequest} from './provider-quota'
import {getPublicWeatherLocation, type WorldWeatherLocation} from './world-locations'

const WORLD_WEATHER_REFRESH_MINUTES = 30
const MILLISECONDS_PER_MINUTE = 60_000
export const WORLD_WEATHER_REFRESH_MILLISECONDS =
  WORLD_WEATHER_REFRESH_MINUTES * MILLISECONDS_PER_MINUTE

interface WorldWeatherFeedCurrentState {
  readonly feed: WeatherFeed
  readonly status: 'current'
}

interface WorldWeatherFeedMissingState {
  readonly status: 'missing'
}

interface WorldWeatherFeedOutdatedState {
  readonly feed: WeatherFeed
  readonly status: 'outdated'
}

export type WorldWeatherFeedState =
  | WorldWeatherFeedCurrentState
  | WorldWeatherFeedMissingState
  | WorldWeatherFeedOutdatedState

export type WorldWeatherIngestionResult = WeatherCollectionResult

const getCurrentCutoff = (now: Date): Date =>
  new Date(now.getTime() - WORLD_WEATHER_REFRESH_MILLISECONDS)

const hasCurrentWorldWeather = async (
  locationId: WeatherLocationId,
  now: Date,
  database: WeatherTransaction,
): Promise<boolean> => {
  const record = await getLatestWeather(locationId, database as unknown as Database)
  return record !== undefined && record.collectedAt.getTime() >= getCurrentCutoff(now).getTime()
}

/** Collects one OpenWeather row for a registered fixed coordinate. */
export const ingestWorldWeather = async (
  location: WorldWeatherLocation,
  now = new Date(),
): Promise<WorldWeatherIngestionResult> => {
  const bucket = Math.floor(now.getTime() / WORLD_WEATHER_REFRESH_MILLISECONDS)

  return runWeatherCollection({
    collect: async () => {
      await reserveOpenWeatherRequest('current', now)
      const current = await fetchOpenWeatherCurrent({
        latitude: location.latitude,
        longitude: location.longitude,
      })

      return {
        collectedAt: now,
        humidityPercent: current.humidityPercent,
        location: location.id,
        precipitation: current.precipitation,
        precipitationMillimeters: current.precipitationMillimeters,
        sky: current.sky,
        temperatureCelsius: current.temperatureCelsius,
        weatherAt: current.observedAt,
        windSpeedMetersPerSecond: current.windSpeedMetersPerSecond,
      }
    },
    collectionKey: `openweather-v1|${location.id}|${bucket}`,
    isCurrent: (transaction) => hasCurrentWorldWeather(location.id, now, transaction),
    locationId: location.id,
    now,
    saveFailure: 'propagate',
  })
}

const createWorldWeatherFeed = (
  location: WorldWeatherLocation,
  record: NonNullable<Awaited<ReturnType<typeof getLatestWeather>>>,
  stale: boolean,
): WeatherFeed => ({
  current: createCurrentWeather(record),
  expiresAt: new Date(
    record.collectedAt.getTime() + WORLD_WEATHER_REFRESH_MILLISECONDS,
  ).toISOString(),
  location: getPublicWeatherLocation(location),
  observedAt: record.weatherAt.toISOString(),
  schemaVersion: 2,
  source: {name: 'OpenWeather', url: 'https://openweathermap.org/'},
  stale,
  updatedAt: record.collectedAt.toISOString(),
})

/** Reads cached world weather and reports whether its provider refresh is due. */
export const getWorldWeatherFeedState = async (
  location: WorldWeatherLocation,
  now = new Date(),
  database: Database = getDatabase(),
): Promise<WorldWeatherFeedState> => {
  const record = await getLatestWeather(location.id, database)
  if (record === undefined) {
    return {status: 'missing'}
  }

  const isCurrent = record.collectedAt.getTime() >= getCurrentCutoff(now).getTime()
  const feed = createWorldWeatherFeed(location, record, !isCurrent)
  return {feed, status: isCurrent ? 'current' : 'outdated'}
}
