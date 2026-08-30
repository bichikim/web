import {beforeEach, expect, it, vi} from 'vitest'

const feedResponseMocks = vi.hoisted(() => ({
  createWorldWeatherFeedResponse: vi.fn(),
}))

vi.mock('src/server/weather/world-feed-response', () => ({
  createWorldWeatherFeedResponse: feedResponseMocks.createWorldWeatherFeedResponse,
}))

import {GET, HEAD} from '../[city]'
import {invokeApiRoute} from '../../../__tests__/invoke'

beforeEach(() => {
  feedResponseMocks.createWorldWeatherFeedResponse.mockReset()
  feedResponseMocks.createWorldWeatherFeedResponse.mockResolvedValue(
    Response.json({location: 'Tokyo'}),
  )
})

it('should route provider location identifiers to the world-weather feed', async () => {
  const response = await invokeApiRoute(
    GET,
    new Request('https://www.pomofi.io/api/weather/feeds/openweather%3A35.6900%2C139.6900.json'),
    {city: 'openweather%3A35.6900%2C139.6900.json'},
  )

  expect(response.status).toBe(200)
  expect(feedResponseMocks.createWorldWeatherFeedResponse).toHaveBeenCalledExactlyOnceWith(
    'openweather:35.6900,139.6900',
  )
})

it('should decode an encoded legacy location identifier', async () => {
  await invokeApiRoute(
    GET,
    new Request('https://www.pomofi.io/api/weather/feeds/openweather%3Alegacy%3Aseoul.json'),
    {city: 'openweather%3Alegacy%3Aseoul.json'},
  )

  expect(feedResponseMocks.createWorldWeatherFeedResponse).toHaveBeenCalledExactlyOnceWith(
    'openweather:legacy:seoul',
  )
})

it('should remove the public JSON suffix before collecting a city feed', async () => {
  const response = await invokeApiRoute(
    GET,
    new Request('https://www.pomofi.io/api/weather/feeds/seoul.json'),
    {city: 'seoul.json'},
  )

  expect(response.status).toBe(200)
  expect(feedResponseMocks.createWorldWeatherFeedResponse).toHaveBeenCalledExactlyOnceWith(
    'openweather:legacy:seoul',
  )
})

it('should preserve an extensionless city for HEAD requests', async () => {
  const response = await invokeApiRoute(
    HEAD,
    new Request('https://www.pomofi.io/api/weather/feeds/busan', {method: 'HEAD'}),
    {city: 'busan'},
  )

  expect(response.status).toBe(200)
  expect(feedResponseMocks.createWorldWeatherFeedResponse).toHaveBeenCalledExactlyOnceWith(
    'openweather:legacy:busan',
  )
})

it('should let the world feed boundary reject an unknown legacy city', async () => {
  await invokeApiRoute(GET, new Request('https://www.pomofi.io/api/weather/feeds/tokyo.json'), {
    city: 'tokyo.json',
  })

  expect(feedResponseMocks.createWorldWeatherFeedResponse).toHaveBeenCalledExactlyOnceWith('tokyo')
})

it('should preserve malformed percent encoding for boundary rejection', async () => {
  await invokeApiRoute(
    GET,
    new Request('https://www.pomofi.io/api/weather/feeds/%25E0%25A4%25A.json'),
    {city: '%E0%A4%A.json'},
  )

  expect(feedResponseMocks.createWorldWeatherFeedResponse).toHaveBeenCalledExactlyOnceWith(
    '%E0%A4%A',
  )
})
