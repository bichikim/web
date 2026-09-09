import {expect, it, vi} from 'vitest'
import {restoreWeatherLocationNames} from '../location-names'

const location = {
  country: 'US',
  id: 'openweather:40.7128,-74.0060' as const,
  name: '뉴욕',
  region: 'New York',
}

it('should recover names only for the same stored city ID', async () => {
  const names = {en: 'New York', ko: '뉴욕'}
  const search = vi.fn().mockResolvedValue([{...location, names}])
  await expect(restoreWeatherLocationNames({location, search})).resolves.toEqual({
    ...location,
    names,
  })
  expect(search).toHaveBeenCalledWith({query: '뉴욕,US'})
})

it('should preserve the stored city when no exact match exists', async () => {
  const search = vi
    .fn()
    .mockResolvedValue([{...location, id: 'openweather:1.0000,2.0000', names: {en: 'Other'}}])
  await expect(restoreWeatherLocationNames({location, search})).resolves.toBe(location)
})

it('should avoid searching already localized or legacy cities', async () => {
  const search = vi.fn()
  const localized = {...location, names: {en: 'New York'}}
  await expect(restoreWeatherLocationNames({location: localized, search})).resolves.toBe(localized)
  await restoreWeatherLocationNames({location: {...location, legacyCitySlug: 'seoul'}, search})
  expect(search).not.toHaveBeenCalled()
})

it('should expose lookup errors without replacing the saved location', async () => {
  const error = new Error('unavailable')
  await expect(
    restoreWeatherLocationNames({location, search: vi.fn().mockRejectedValue(error)}),
  ).rejects.toBe(error)
})
