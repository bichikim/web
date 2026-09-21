/** @vitest-environment jsdom */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {
  createPScenePreferencesRepository,
  type PScenePreferencesStorage,
} from '../features/focus-room-scene-preferences/create-p-scene-preferences-repository'
import {DEFAULT_P_SCENE_PREFERENCES} from '../features/focus-room-scene-preferences/model'

const stalePreferences = {
  activity: 'reading',
  gaze: 'focused',
  timeMode: 'day',
} as const

const updatedPreferences = {
  activity: 'typing',
  gaze: 'user',
  timeMode: 'night',
} as const

const createStorageHarness = () => {
  const tossValues = new Map<string, unknown>()
  const webValues = new Map<string, unknown>()
  const storage = {
    readToss: vi.fn(async (key: string) => tossValues.get(key) ?? null),
    readWeb: vi.fn((key: string) => webValues.get(key) ?? null),
    usesTossStorage: vi.fn(() => true),
    writeToss: vi.fn(async (key: string, value: unknown) => {
      tossValues.set(key, value)
    }),
    writeWeb: vi.fn((key: string, value: unknown) => {
      webValues.set(key, value)
    }),
  } satisfies PScenePreferencesStorage

  return {
    repository: createPScenePreferencesRepository({storage}),
    storage,
    tossValues,
    webValues,
  }
}

describe('focus-room scene preferences native write failure', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'ReactNativeWebView')
    vi.unstubAllGlobals()
  })

  it('should keep the browser copy authoritative for reads in the same session after native persistence fails', async () => {
    const {repository, storage, tossValues, webValues} = createStorageHarness()
    tossValues.set('pomo:focus-room-scene-preferences:v1', stalePreferences)
    storage.writeToss.mockRejectedValueOnce(new Error('native unavailable'))

    await repository.write(updatedPreferences)

    expect(webValues.get('pomo:focus-room-scene-preferences:v1')).toEqual(updatedPreferences)
    expect(tossValues.get('pomo:focus-room-scene-preferences:v1')).toEqual(stalePreferences)
    await expect(repository.read()).resolves.toEqual(updatedPreferences)
  })

  it('should still prefer the browser copy after reload when native persistence previously failed', async () => {
    const firstHarness = createStorageHarness()
    firstHarness.tossValues.set('pomo:focus-room-scene-preferences:v1', stalePreferences)
    firstHarness.storage.writeToss.mockRejectedValueOnce(new Error('native unavailable'))

    await firstHarness.repository.write(updatedPreferences)

    const reloadedHarness = createStorageHarness()
    reloadedHarness.tossValues.set('pomo:focus-room-scene-preferences:v1', stalePreferences)
    reloadedHarness.webValues.set('pomo:focus-room-scene-preferences:v1', updatedPreferences)
    reloadedHarness.webValues.set(
      'pomo:focus-room-scene-preferences:native-write-failure:v1',
      true,
    )

    await expect(reloadedHarness.repository.read()).resolves.toEqual(updatedPreferences)
  })

  it('should not resurrect stale native values after a failed write when the browser copy is valid', async () => {
    const {repository, storage, tossValues, webValues} = createStorageHarness()
    tossValues.set('pomo:focus-room-scene-preferences:v1', stalePreferences)
    webValues.set('pomo:focus-room-scene-preferences:v1', updatedPreferences)
    webValues.set('pomo:focus-room-scene-preferences:native-write-failure:v1', true)
    storage.writeToss.mockRejectedValue(new Error('native unavailable'))

    await repository.write(updatedPreferences)

    await expect(repository.read()).resolves.toEqual(updatedPreferences)
    expect(tossValues.get('pomo:focus-room-scene-preferences:v1')).toEqual(stalePreferences)
  })
})
