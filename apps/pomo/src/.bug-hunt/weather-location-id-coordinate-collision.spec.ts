/** @vitest-environment node */
import {expect, it, vi} from 'vitest'

const environmentMocks = vi.hoisted(() => ({
  env: {OPENWEATHER_API_KEY: 'secret-key'},
}))

vi.mock('src/env', () => ({
  env: environmentMocks.env,
}))

import {searchOpenWeatherLocations} from '../server/weather/openweather-client'

it('should keep distinct provider location ids for nearby search results', async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
    Response.json([
      {
        country: 'GB',
        lat: 51.52001,
        lon: -0.11001,
        name: 'Location A',
        state: 'England',
      },
      {
        country: 'GB',
        lat: 51.52004,
        lon: -0.11004,
        name: 'Location B',
        state: 'England',
      },
    ]),
  )

  const locations = await searchOpenWeatherLocations({fetcher, query: 'nearby'})

  expect(locations).toHaveLength(2)
  expect(locations[0]?.providerLocationId).not.toBe(locations[1]?.providerLocationId)
})
