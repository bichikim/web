/** @vitest-environment node */
import {expect, it, vi} from 'vitest'

import {createPScenePreferencesRepository} from '../features/focus-room-scene-preferences/create-p-scene-preferences-repository'

const SCENE_PREFERENCES_KEY = 'pomo:focus-room-scene-preferences:v1'
const NATIVE_WRITE_FAILURE_KEY = 'pomo:focus-room-scene-preferences:native-write-failure:v1'

const nativePreferences = {
  activity: 'writing',
  gaze: 'user',
  timeMode: 'auto',
} as const

const defaultPreferences = {
  activity: 'reading',
  gaze: 'focused',
  timeMode: 'day',
} as const

it('should read native scene preferences after reset left a stale web default and failure marker', async () => {
  const values = new Map<string, unknown>([
    [NATIVE_WRITE_FAILURE_KEY, true],
    [SCENE_PREFERENCES_KEY, defaultPreferences],
  ])
  const repository = createPScenePreferencesRepository({
    storage: {
      readToss: vi.fn(async (key) => (key === SCENE_PREFERENCES_KEY ? nativePreferences : null)),
      readWeb: (key) => values.get(key) ?? null,
      usesTossStorage: () => true,
      writeToss: vi.fn(async () => undefined),
      writeWeb: (key, value) => {
        values.set(key, value)
      },
    },
  })

  await expect(repository.read()).resolves.toEqual(nativePreferences)
})
