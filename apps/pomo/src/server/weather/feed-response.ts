import {WEATHER_CITY_SLUGS, type WeatherCitySlug} from 'src/features/weather'
import {getWeatherFeedState, type WeatherFeedState} from './get-weather-feed-state'
import {ingestWeatherCity, type WeatherIngestionResult} from './ingest-weather'
import {
  getWeatherRetryAfterSeconds,
  weatherFeedSuccessResponse,
  weatherNotFoundResponse,
  weatherUnavailableResponse,
} from './feed-http'
import {getSecondsUntilNextKmaAvailability} from './kma-time'

const MILLISECONDS_PER_SECOND = 1_000
const UNEXPECTED_FAILURE_RETRY_SECONDS = 60

const isWeatherCitySlug = (value: string): value is WeatherCitySlug =>
  WEATHER_CITY_SLUGS.some((slug) => slug === value)

const getStateFeed = (state: WeatherFeedState) =>
  state.status === 'missing' ? undefined : state.feed

interface WeatherFeedOutcome {
  readonly collectionStatus?: WeatherIngestionResult['status']
  readonly feed: ReturnType<typeof getStateFeed>
  readonly retryAfter?: Date
}

const getOrCollectWeatherFeed = async (
  city: WeatherCitySlug,
  now: Date,
): Promise<WeatherFeedOutcome> => {
  const existingState = await getWeatherFeedState(city, now)

  if (existingState.status === 'current') {
    return {feed: existingState.feed}
  }

  let collectionResult: WeatherIngestionResult

  try {
    collectionResult = await ingestWeatherCity(city, now)
  } catch (error) {
    if (existingState.status === 'outdated') {
      console.error(`Failed to refresh weather for ${city}; serving outdated data.`, error)
      return {
        feed: existingState.feed,
        retryAfter: new Date(
          now.getTime() + UNEXPECTED_FAILURE_RETRY_SECONDS * MILLISECONDS_PER_SECOND,
        ),
      }
    }

    throw error
  }

  if (collectionResult.status === 'failed') {
    console.error(`Failed to collect weather for ${city}.`, collectionResult.error)
  }

  const state = await getWeatherFeedState(city, now)
  const retryAfter = (() => {
    switch (collectionResult.status) {
      case 'collecting':
      case 'cooldown':
      case 'failed':
        return collectionResult.retryAfter
      case 'completed':
      case 'current':
        return undefined
      default: {
        const exhaustiveStatus: never = collectionResult
        return exhaustiveStatus
      }
    }
  })()

  return {collectionStatus: collectionResult.status, feed: getStateFeed(state), retryAfter}
}

export const createWeatherFeedResponse = async (
  city: string,
  now = new Date(),
): Promise<Response> => {
  if (!isWeatherCitySlug(city)) {
    return weatherNotFoundResponse('weather_city_not_found')
  }

  let outcome: WeatherFeedOutcome | undefined

  try {
    outcome = await getOrCollectWeatherFeed(city, now)
  } catch (error) {
    console.error(`Failed to collect initial weather for ${city}.`, error)
  }

  if (outcome?.feed === undefined) {
    const retryAfterSeconds =
      outcome?.retryAfter === undefined
        ? undefined
        : getWeatherRetryAfterSeconds(outcome.retryAfter, now)
    const code =
      outcome?.collectionStatus === 'collecting' ? 'weather_collecting' : 'weather_unavailable'

    return weatherUnavailableResponse({code, retryAfterSeconds})
  }

  const nextAvailabilityMaxAge = getSecondsUntilNextKmaAvailability(now)
  const retryMaxAge =
    outcome.retryAfter === undefined
      ? undefined
      : getWeatherRetryAfterSeconds(outcome.retryAfter, now)
  const maxAge =
    retryMaxAge === undefined
      ? nextAvailabilityMaxAge
      : Math.min(nextAvailabilityMaxAge, retryMaxAge)
  const feed =
    outcome.retryAfter === undefined
      ? outcome.feed
      : {
          ...outcome.feed,
          expiresAt: new Date(now.getTime() + maxAge * MILLISECONDS_PER_SECOND).toISOString(),
        }

  return weatherFeedSuccessResponse(feed, maxAge)
}
