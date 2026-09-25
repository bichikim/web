import type {WeatherCitySlug} from 'src/features/weather'
import {hasCurrentWeather} from '../repositories/weather'
import {fetchKmaObservation, fetchKmaSky} from './kma-client'
import {
  getKmaObservationTime,
  getKmaSkyTime,
  getLatestKmaAvailabilityTime,
  parseKmaDateTime,
} from './kma-time'
import {runWeatherCollection, type WeatherCollectionResult} from './collection-orchestrator'
import {getWeatherLocation} from './locations'
export type WeatherIngestionResult = WeatherCollectionResult

interface WeatherCollectionRequest {
  readonly collectionKey: string
  readonly observationTime: ReturnType<typeof getKmaObservationTime>
  readonly requestLocation: {
    readonly gridX: number
    readonly gridY: number
  }
  readonly requiredCollectedAt: Date
  readonly skyTime: ReturnType<typeof getKmaSkyTime>
  readonly weatherAt: Date
}

const createCollectionRequest = (
  citySlug: WeatherCitySlug,
  now: Date,
): WeatherCollectionRequest => {
  const location = getWeatherLocation(citySlug)
  const requestLocation = {gridX: location.gridX, gridY: location.gridY}
  const observationTime = getKmaObservationTime(now)
  const skyTime = getKmaSkyTime(now)

  return {
    collectionKey: [
      'weather-v1',
      citySlug,
      `observation:${requestLocation.gridX}:${requestLocation.gridY}:${observationTime.date}:${observationTime.time}`,
      `sky:${requestLocation.gridX}:${requestLocation.gridY}:${skyTime.date}:${skyTime.time}`,
    ].join('|'),
    observationTime,
    requestLocation,
    requiredCollectedAt: getLatestKmaAvailabilityTime(now),
    skyTime,
    weatherAt: parseKmaDateTime(observationTime.date, observationTime.time),
  }
}

/** Collects one complete domain weather row for the latest available current time. */
export const ingestWeatherCity = async (
  citySlug: WeatherCitySlug,
  now = new Date(),
): Promise<WeatherIngestionResult> => {
  const request = createCollectionRequest(citySlug, now)

  return runWeatherCollection({
    collect: async () => {
      const [observation, sky] = await Promise.all([
        fetchKmaObservation({
          baseTime: request.observationTime,
          location: request.requestLocation,
        }),
        fetchKmaSky({
          baseTime: request.skyTime,
          location: request.requestLocation,
          targetTime: now,
        }),
      ])

      return {
        collectedAt: now,
        humidityPercent: observation.humidityPercent,
        location: citySlug,
        precipitation: observation.precipitation,
        precipitationMillimeters: observation.precipitationMillimeters,
        sky,
        temperatureCelsius: observation.temperatureCelsius,
        weatherAt: request.weatherAt,
        windSpeedMetersPerSecond: observation.windSpeedMetersPerSecond,
      }
    },
    collectionKey: request.collectionKey,
    isCurrent: (transaction) =>
      hasCurrentWeather(citySlug, request.weatherAt, request.requiredCollectedAt, transaction),
    locationId: citySlug,
    now,
    saveFailure: 'record',
  })
}
