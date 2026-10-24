import type {APIEvent} from '@solidjs/start/server'

import {searchWorldWeatherLocations} from 'src/server/weather/world-locations'

const MINIMUM_QUERY_LENGTH = 2
const MAXIMUM_QUERY_LENGTH = 80
const HTTP_BAD_REQUEST = 400
const HTTP_SERVICE_UNAVAILABLE = 503

export const GET = async (event: APIEvent): Promise<Response> => {
  const query = new URL(event.request.url).searchParams.get('q')?.trim() ?? ''

  if (query.length < MINIMUM_QUERY_LENGTH || query.length > MAXIMUM_QUERY_LENGTH) {
    return Response.json(
      {code: 'weather_location_query_invalid'},
      {headers: {'Cache-Control': 'no-store'}, status: HTTP_BAD_REQUEST},
    )
  }

  try {
    const locations = await searchWorldWeatherLocations({query})
    return Response.json(locations, {
      headers: {
        'Cache-Control': 'public, max-age=60, s-maxage=86400',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    console.error('Failed to search world weather locations.', error)
    return Response.json(
      {code: 'weather_location_search_unavailable'},
      {
        headers: {'Cache-Control': 'no-store', 'Retry-After': '60'},
        status: HTTP_SERVICE_UNAVAILABLE,
      },
    )
  }
}
