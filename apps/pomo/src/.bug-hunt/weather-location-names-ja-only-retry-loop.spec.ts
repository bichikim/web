/** @vitest-environment node */

import {expect, it, vi} from 'vitest'

import {createWeatherPreferenceRepository} from '../features/weather/preference'
import {restoreWeatherLocationNames} from '../features/weather/location-names'

const location = {
  country: 'US',
  id: 'openweather:40.7128,-74.0060' as const,
  name: '뉴욕',
  region: 'New York',
}

it('should stop retrying name lookup when search only returns non-English/Korean names', async () => {
  const search = vi.fn().mockResolvedValue([{...location, names: {ja: 'ニューヨーク'}}])
  const webValues = new Map<string, unknown>()
  const storage = {
    readToss: vi.fn(async () => null),
    readWeb: (key: string) => webValues.get(key) ?? null,
    usesTossStorage: () => false,
    writeToss: vi.fn(async () => undefined),
    writeWeb: (key: string, value: unknown) => {
      webValues.set(key, value)
    },
  }
  const repository = createWeatherPreferenceRepository({
    restoreLocation: (saved) => restoreWeatherLocationNames({location: saved, search}),
    storage,
  })

  webValues.set('pomo:weather-preference:v2', {
    enabled: true,
    location,
    sceneMode: 'auto',
  })

  await repository.read()
  await repository.read()

  expect(search).toHaveBeenCalledOnce()
})
