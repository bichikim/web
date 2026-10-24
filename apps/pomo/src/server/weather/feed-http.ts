const HTTP_NOT_FOUND = 404
const HTTP_SERVICE_UNAVAILABLE = 503
const MILLISECONDS_PER_SECOND = 1_000

interface WeatherUnavailableResponseOptions {
  readonly code: string
  readonly retryAfterSeconds?: number
}

export const weatherNotFoundResponse = (code: string): Response =>
  Response.json({code}, {headers: {'Cache-Control': 'no-store'}, status: HTTP_NOT_FOUND})

export const weatherUnavailableResponse = (
  options: WeatherUnavailableResponseOptions,
): Response => {
  const headers: Record<string, string> = {'Cache-Control': 'no-store'}

  if (options.retryAfterSeconds !== undefined) {
    headers['Retry-After'] = options.retryAfterSeconds.toString()
  }

  return Response.json({code: options.code}, {headers, status: HTTP_SERVICE_UNAVAILABLE})
}

export const weatherFeedSuccessResponse = (feed: object, maxAgeSeconds: number): Response =>
  Response.json(feed, {
    headers: {
      'Cache-Control': `public, max-age=${maxAgeSeconds}, s-maxage=${maxAgeSeconds}`,
      'X-Content-Type-Options': 'nosniff',
    },
  })

export const getWeatherRetryAfterSeconds = (retryAfter: Date, now: Date): number =>
  Math.max(1, Math.ceil((retryAfter.getTime() - now.getTime()) / MILLISECONDS_PER_SECOND))
