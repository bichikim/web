import {describe, expect, it, vi} from 'vitest'

import {
  createPScenePreferencesRepository,
  type PScenePreferencesStorage,
} from '../features/focus-room-scene-preferences/create-p-scene-preferences-repository'

const createRepository = () => {
  const values = new Map<string, unknown>()
  const storage = {
    readToss: vi.fn<PScenePreferencesStorage['readToss']>().mockResolvedValue(null),
    readWeb: (key: string) => values.get(key) ?? null,
    usesTossStorage: () => true,
    writeToss: vi.fn<PScenePreferencesStorage['writeToss']>().mockResolvedValue(),
    writeWeb: (key: string, value: unknown) => {
      values.set(key, value)
    },
  } satisfies PScenePreferencesStorage
  return {
    repository: createPScenePreferencesRepository({storage}),
    storage,
  }
}

const nativePreferences = {activity: 'reading', gaze: 'focused', timeMode: 'day'} as const
const recoveredNativePreferences = {activity: 'writing', gaze: 'user', timeMode: 'night'} as const

describe('scene preferences native read bypass after write failure', () => {
  it('should read recovered native preferences after a transient native write failure', async () => {
    const {repository, storage} = createRepository()
    storage.readToss.mockResolvedValue(nativePreferences)

    await expect(repository.read()).resolves.toEqual(nativePreferences)

    storage.writeToss.mockRejectedValueOnce(new Error('unavailable'))
    await expect(repository.write(nativePreferences)).resolves.toBeUndefined()

    storage.readToss.mockResolvedValue(recoveredNativePreferences)

    await expect(repository.read()).resolves.toEqual(recoveredNativePreferences)
  })
})
