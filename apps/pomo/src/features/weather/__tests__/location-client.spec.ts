import {afterEach, expect, it, vi} from 'vitest'

import {searchWeatherLocations} from '../location-client'

afterEach(() => {
  vi.unstubAllGlobals()
})

it('should search and validate world-weather locations', async () => {
  const location = {
    country: 'JP',
    id: 'openweather:35.6900,139.6900',
    name: 'Tokyo',
    region: 'Tokyo',
  }
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json([location]))
  vi.stubGlobal('fetch', fetcher)

  await expect(searchWeatherLocations({query: 'Tokyo'})).resolves.toEqual([location])
  expect(fetcher).toHaveBeenCalledOnce()
  const request = fetcher.mock.calls[0]?.[0]
  expect(String(request)).toContain('/api/weather/locations?q=Tokyo')
})

it('should reject invalid location results', () => {
  vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(Response.json([{id: 'Tokyo'}])))

  return expect(searchWeatherLocations({query: 'Tokyo'})).rejects.toThrow(
    'JSON API response does not match its schema',
  )
})
