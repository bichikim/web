import {beforeEach, expect, it, vi} from 'vitest'

const feedResponseMocks = vi.hoisted(() => ({createWeatherFeedResponse: vi.fn()}))

vi.mock('src/server/weather/feed-response', () => feedResponseMocks)

import {GET, HEAD} from '../[city]'
import {invokeApiRoute} from '../../../__tests__/invoke'

beforeEach(() => {
  feedResponseMocks.createWeatherFeedResponse.mockReset()
  feedResponseMocks.createWeatherFeedResponse.mockResolvedValue(Response.json({city: 'seoul'}))
})

it('should remove the public JSON suffix before collecting a city feed', async () => {
  const response = await invokeApiRoute(
    GET,
    new Request('https://www.pomofi.io/api/weather/feeds/seoul.json'),
    {city: 'seoul.json'},
  )

  expect(response.status).toBe(200)
  expect(feedResponseMocks.createWeatherFeedResponse).toHaveBeenCalledExactlyOnceWith('seoul')
})

it('should preserve an extensionless city for HEAD requests', async () => {
  const response = await invokeApiRoute(
    HEAD,
    new Request('https://www.pomofi.io/api/weather/feeds/busan', {method: 'HEAD'}),
    {city: 'busan'},
  )

  expect(response.status).toBe(200)
  expect(feedResponseMocks.createWeatherFeedResponse).toHaveBeenCalledExactlyOnceWith('busan')
})
