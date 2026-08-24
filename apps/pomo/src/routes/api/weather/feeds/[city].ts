import type {APIEvent} from '@solidjs/start/server'

import {createWeatherFeedResponse} from 'src/server/weather/feed-response'

const JSON_SUFFIX = '.json'

const readCity = (value: string): string =>
  value.endsWith(JSON_SUFFIX) ? value.slice(0, -JSON_SUFFIX.length) : value

export const GET = (event: APIEvent): Promise<Response> =>
  createWeatherFeedResponse(readCity(event.params.city))

export const HEAD = (event: APIEvent): Promise<Response> =>
  createWeatherFeedResponse(readCity(event.params.city))
