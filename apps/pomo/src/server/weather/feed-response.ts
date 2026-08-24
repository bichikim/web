import {WEATHER_CITY_SLUGS, type WeatherCitySlug} from 'src/features/weather'
import {ingestWeatherCity, type WeatherIngestionResult} from './ingest-weather'
import {getSecondsUntilNextKmaAvailability} from './kma-time'
import {getWeatherFeedState, type WeatherFeedState} from './repository'

const HTTP_NOT_FOUND = 404
const HTTP_SERVICE_UNAVAILABLE = 503
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
    return Response.json(
      {code: 'weather_city_not_found'},
      {headers: {'Cache-Control': 'no-store'}, status: HTTP_NOT_FOUND},
    )
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
        : Math.max(
            1,
            Math.ceil((outcome.retryAfter.getTime() - now.getTime()) / MILLISECONDS_PER_SECOND),
          )
    const headers: Record<string, string> = {'Cache-Control': 'no-store'}

    if (retryAfterSeconds !== undefined) {
      headers['Retry-After'] = retryAfterSeconds.toString()
    }

    const code =
      outcome?.collectionStatus === 'collecting' ? 'weather_collecting' : 'weather_unavailable'

    return Response.json({code}, {headers, status: HTTP_SERVICE_UNAVAILABLE})
  }

  const nextAvailabilityMaxAge = getSecondsUntilNextKmaAvailability(now)
  const retryMaxAge =
    outcome.retryAfter === undefined
      ? undefined
      : Math.max(
          1,
          Math.ceil((outcome.retryAfter.getTime() - now.getTime()) / MILLISECONDS_PER_SECOND),
        )
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

  return Response.json(feed, {
    headers: {
      'Cache-Control': `public, max-age=${maxAge}, s-maxage=${maxAge}`,
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
