/** @vitest-environment jsdom */
import {cleanup, renderHook} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {PreferenceProvider} from 'src/hooks/use-preference'
import {useRelaxPreferences} from '../use-relax-preferences'

const backgroundKey = 'pomo:relax-background:v1'
const weatherKey = 'pomo:relax-weather:v1'
const mistKey = 'pomo:relax-mist:v1'
const daylightKey = 'pomo:relax-daylight:v1'
const background = '/relax-player/coastal-village-upper-floor.png'
const position = {depth: 0.38, x: 0.6, y: 0.7}

beforeEach(() => localStorage.clear())
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('should restore every scene choice after remounting without writing defaults', () => {
  const write = vi.spyOn(Storage.prototype, 'setItem')
  const first = renderHook(useRelaxPreferences, {wrapper: PreferenceProvider})
  expect(write).not.toHaveBeenCalled()
  first.result.setSelectedBackground(background)
  first.result.setWeather('rainy')
  first.result.setMistIntensity(0.25)
  first.result.setSelectedDaylightPosition(position)
  first.cleanup()
  write.mockClear()
  const {result} = renderHook(useRelaxPreferences, {wrapper: PreferenceProvider})
  expect(result.selectedBackground()).toBe(background)
  expect(result.weather()).toBe('rainy')
  expect(result.mistIntensity()).toBe(0.25)
  expect(result.selectedDaylightPosition()).toEqual(position)
  expect(write).not.toHaveBeenCalled()
})

it.each([
  ['null', 'null', 'null', 'null'],
  ['"https://untrusted.example/image.png"', '"snowy"', '1.01', '{"depth":0.38,"x":-0.1,"y":0.7}'],
  ['{}', 'true', '-0.1', '{"depth":0.38,"x":0.6}'],
  ['broken', 'broken', '"0.5"', '{"depth":2,"x":0.6,"y":0.7}'],
])('should retain defaults for invalid settings %s', (source, weather, mist, daylight) => {
  localStorage.setItem(backgroundKey, source)
  localStorage.setItem(weatherKey, weather)
  localStorage.setItem(mistKey, mist)
  localStorage.setItem(daylightKey, daylight)
  const {result} = renderHook(useRelaxPreferences, {wrapper: PreferenceProvider})
  expect(result.selectedBackground()).toBeNull()
  expect(result.weather()).toBe('sunny')
  expect(result.mistIntensity()).toBe(1)
  expect(result.selectedDaylightPosition()).toBeNull()
})

it('should preserve unrelated saved fields and the latest edit during asynchronous restoration', async () => {
  const pending = Promise.withResolvers<unknown>()
  const saved = new Map<string, unknown>([
    [backgroundKey, background],
    [weatherKey, 'rainy'],
    [mistKey, 0.25],
    [daylightKey, position],
  ])
  const write = vi.fn()
  const {result} = renderHook(useRelaxPreferences, {
    wrapper: (props) => (
      <PreferenceProvider
        storage={{
          read: (key) => pending.promise.then(() => saved.get(key)),
          write,
        }}
      >
        {props.children}
      </PreferenceProvider>
    ),
  })
  result.setWeather('sunny')
  expect(write).not.toHaveBeenCalled()
  pending.resolve(undefined)
  await vi.waitFor(() => expect(result.selectedBackground()).toBe(background))
  expect(result.weather()).toBe('sunny')
  expect(result.mistIntensity()).toBe(0.25)
  expect(result.selectedDaylightPosition()).toEqual(position)
  expect(write).toHaveBeenCalledExactlyOnceWith(weatherKey, 'sunny')
})

it('should report write errors and keep the last persisted scene intact', () => {
  localStorage.setItem(weatherKey, '"rainy"')
  const error = new Error('storage is full')
  const onError = vi.fn()
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw error
  })
  const {result} = renderHook(useRelaxPreferences, {
    wrapper: (props) => <PreferenceProvider onError={onError}>{props.children}</PreferenceProvider>,
  })
  result.setWeather('sunny')
  expect(onError).toHaveBeenCalledExactlyOnceWith(error)
  expect(result.weather()).toBe('sunny')
  expect(localStorage.getItem(weatherKey)).toBe('"rainy"')
})
