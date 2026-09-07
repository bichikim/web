import {getTableConfig} from 'drizzle-orm/pg-core'
import {expect, it} from 'vitest'

import {
  weather,
  weatherCollectionState,
  weatherLocations,
  weatherPrecipitationEnum,
  weatherProviderUsage,
  weatherSkyEnum,
} from '../weather'

it('should expose weather table constraints, enums, and indexes', () => {
  expect(weatherPrecipitationEnum.enumValues).toEqual(['none', 'rain', 'mixed', 'snow'])
  expect(weatherSkyEnum.enumValues).toEqual(['clear', 'cloudy', 'overcast'])
  expect(getTableConfig(weatherLocations)).toMatchObject({
    checks: [expect.any(Object), expect.any(Object)],
    indexes: [expect.any(Object)],
  })
  expect(getTableConfig(weather).indexes).toEqual([expect.any(Object)])
  expect(getTableConfig(weatherProviderUsage).checks).toEqual([
    expect.any(Object),
    expect.any(Object),
    expect.any(Object),
  ])
  expect(getTableConfig(weatherCollectionState).checks).toEqual([
    expect.any(Object),
    expect.any(Object),
  ])
})
