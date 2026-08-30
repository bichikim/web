import 'server-only'

import {parseWeatherLocationId} from 'src/features/weather'
import {getWorldWeatherLocation} from './world-locations'
import {
  getWorldWeatherFeedState,
  ingestWorldWeather,
  type WorldWeatherFeedState,
  type WorldWeatherIngestionResult,
} from './world-weather'

const HTTP_NOT_FOUND = 404
const HTTP_SERVICE_UNAVAILABLE = 503
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
    return Response.json(
      {code: 'weather_location_not_found'},
      {headers: {'Cache-Control': 'no-store'}, status: HTTP_NOT_FOUND},
    )
  }

  const location = await getWorldWeatherLocation(locationId)
  if (location === undefined) {
    return Response.json(
      {code: 'weather_location_not_found'},
      {headers: {'Cache-Control': 'no-store'}, status: HTTP_NOT_FOUND},
    )
  }

  const existingState = await getWorldWeatherFeedState(location, now)
  if (existingState.status === 'current') {
    const maxAge = Math.max(
      1,
      Math.ceil(
        (Date.parse(existingState.feed.expiresAt) - now.getTime()) / MILLISECONDS_PER_SECOND,
      ),
    )
    return Response.json(existingState.feed, {
      headers: {
        'Cache-Control': `public, max-age=${maxAge}, s-maxage=${maxAge}`,
        'X-Content-Type-Options': 'nosniff',
      },
    })
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
        : Math.max(
            1,
            Math.ceil((outcome.retryAfter.getTime() - now.getTime()) / MILLISECONDS_PER_SECOND),
          )
    const code =
      outcome.collectionStatus === 'collecting' ? 'weather_collecting' : 'weather_unavailable'
    return Response.json(
      {code},
      {
        headers: {'Cache-Control': 'no-store', 'Retry-After': retryAfterSeconds.toString()},
        status: HTTP_SERVICE_UNAVAILABLE,
      },
    )
  }

  const retryAfterSeconds =
    outcome.retryAfter === undefined
      ? Math.max(
          1,
          Math.ceil((Date.parse(outcome.feed.expiresAt) - now.getTime()) / MILLISECONDS_PER_SECOND),
        )
      : Math.max(
          1,
          Math.ceil((outcome.retryAfter.getTime() - now.getTime()) / MILLISECONDS_PER_SECOND),
        )
  return Response.json(
    {
      ...outcome.feed,
      expiresAt: new Date(
        now.getTime() + retryAfterSeconds * MILLISECONDS_PER_SECOND,
      ).toISOString(),
      stale: outcome.retryAfter !== undefined || outcome.feed.stale,
    },
    {
      headers: {
        'Cache-Control': `public, max-age=${retryAfterSeconds}, s-maxage=${retryAfterSeconds}`,
        'X-Content-Type-Options': 'nosniff',
      },
    },
  )
}
