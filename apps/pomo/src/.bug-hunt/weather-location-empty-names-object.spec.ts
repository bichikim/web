/** @vitest-environment node */
import {expect, it, vi} from 'vitest'
import {restoreWeatherLocationNames} from '../features/weather/location-names'

const location = {
  country: 'US',
  id: 'openweather:40.7128,-74.0060' as const,
  name: '뉴욕',
  region: 'New York',
}

it('should not treat an empty names object from search as successful localization', async () => {
  const search = vi.fn().mockResolvedValue([{...location, names: {}}])
  await expect(restoreWeatherLocationNames({location, search})).resolves.toBe(location)
})

it('should still search when stored location has an empty names object', async () => {
  const stored = {...location, names: {}}
  const search = vi.fn().mockResolvedValue([{...location, names: {en: 'New York', ko: '뉴욕'}}])
  await expect(restoreWeatherLocationNames({location: stored, search})).resolves.toEqual({
    ...location,
    names: {en: 'New York', ko: '뉴욕'},
  })
  expect(search).toHaveBeenCalled()
})
