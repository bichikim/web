import {parseWeatherLocationId} from 'src/features/weather'
import {getWorldWeatherLocation} from './world-locations'
import {
  getWorldWeatherFeedState,
  ingestWorldWeather,
  type WorldWeatherFeedState,
  type WorldWeatherIngestionResult,
} from './world-weather'
import {
  getWeatherRetryAfterSeconds,
  weatherFeedSuccessResponse,
  weatherNotFoundResponse,
  weatherUnavailableResponse,
} from './feed-http'

const MILLISECONDS_PER_SECOND = 1_000
const UNEXPECTED_FAILURE_RETRY_SECONDS = 60

const getStateFeed = (state: WorldWeatherFeedState) =>
  state.status === 'missing' ? undefined : state.feed

interface WorldWeatherFeedOutcome {
  readonly collectionStatus?: WorldWeatherIngestionResult['status']
  readonly feed: ReturnType<typeof getStateFeed>
  readonly retryAfter?: Date
}

/** Returns a cached feed while serializing provider refreshes for one fixed location. */
export const createWorldWeatherFeedResponse = async (
  value: string,
  now = new Date(),
): Promise<Response> => {
  let locationId
  try {
    locationId = parseWeatherLocationId(value)
  } catch {
    return weatherNotFoundResponse('weather_location_not_found')
  }

  const location = await getWorldWeatherLocation(locationId)
  if (location === undefined) {
    return weatherNotFoundResponse('weather_location_not_found')
  }

  const existingState = await getWorldWeatherFeedState(location, now)
  if (existingState.status === 'current') {
    const maxAge = getWeatherRetryAfterSeconds(
      new Date(Date.parse(existingState.feed.expiresAt)),
      now,
    )
    return weatherFeedSuccessResponse(existingState.feed, maxAge)
  }

  let outcome: WorldWeatherFeedOutcome | undefined
  try {
    const collection = await ingestWorldWeather(location, now)
    const refreshedState = await getWorldWeatherFeedState(location, now)
    const retryAfter =
      collection.status === 'collecting' ||
      collection.status === 'cooldown' ||
      collection.status === 'failed'
        ? collection.retryAfter
        : undefined
    outcome = {
      collectionStatus: collection.status,
      feed: getStateFeed(refreshedState) ?? getStateFeed(existingState),
      retryAfter,
    }

    if (collection.status === 'failed') {
      console.error(`Failed to collect world weather for ${locationId}.`, collection.error)
    }
  } catch (error) {
    console.error(`Failed to refresh world weather for ${locationId}.`, error)
    outcome = {
      feed: getStateFeed(existingState),
      retryAfter: new Date(
        now.getTime() + UNEXPECTED_FAILURE_RETRY_SECONDS * MILLISECONDS_PER_SECOND,
      ),
    }
  }

  if (outcome.feed === undefined) {
    const retryAfterSeconds =
      outcome.retryAfter === undefined
        ? UNEXPECTED_FAILURE_RETRY_SECONDS
        : getWeatherRetryAfterSeconds(outcome.retryAfter, now)
    const code =
      outcome.collectionStatus === 'collecting' ? 'weather_collecting' : 'weather_unavailable'
    return weatherUnavailableResponse({code, retryAfterSeconds})
  }

  const retryAfterSeconds =
    outcome.retryAfter === undefined
      ? getWeatherRetryAfterSeconds(new Date(Date.parse(outcome.feed.expiresAt)), now)
      : getWeatherRetryAfterSeconds(outcome.retryAfter, now)
  return weatherFeedSuccessResponse(
    {
      ...outcome.feed,
      expiresAt: new Date(
        now.getTime() + retryAfterSeconds * MILLISECONDS_PER_SECOND,
      ).toISOString(),
      stale: outcome.retryAfter !== undefined || outcome.feed.stale,
    },
    retryAfterSeconds,
  )
}
