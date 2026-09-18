import {describe, expect, it, vi} from 'vitest'
import {
  createPScenePreferencesRepository,
  type PScenePreferencesStorage,
} from '../create-p-scene-preferences-repository'

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

const preferences = {activity: 'typing', gaze: 'user', timeMode: 'night'} as const

describe('createPScenePreferencesRepository', () => {
  it('should prefer native preferences over a stale browser copy', async () => {
    const {repository, storage} = createRepository()
    const stalePreferences = {activity: 'reading', gaze: 'focused', timeMode: 'day'} as const
    storage.writeWeb('pomo:focus-room-scene-preferences:v1', stalePreferences)
    storage.readToss.mockResolvedValue(preferences)

    await expect(repository.read()).resolves.toEqual(preferences)
    expect(storage.readToss).toHaveBeenCalledWith('pomo:focus-room-scene-preferences:v1')
    expect(storage.writeToss).not.toHaveBeenCalled()
    expect(storage.readWeb('pomo:focus-room-scene-preferences:v1')).toEqual(preferences)
  })

  it('should keep write revisions independent across repositories', async () => {
    const first = createRepository()
    const second = createRepository()
    const nativeRead = Promise.withResolvers<unknown>()
    first.storage.readToss.mockReturnValue(nativeRead.promise)

    const pendingRead = first.repository.read()
    await second.repository.write({...preferences, timeMode: 'auto'})
    nativeRead.resolve(preferences)

    await expect(pendingRead).resolves.toEqual(preferences)
    expect(first.storage.readWeb('pomo:focus-room-scene-preferences:v1')).toEqual(preferences)
  })

  it('should allow another repository to write while one native queue is blocked', async () => {
    const first = createRepository()
    const second = createRepository()
    const nativeWrite = Promise.withResolvers<void>()
    first.storage.writeToss.mockReturnValue(nativeWrite.promise)

    const pendingWrite = first.repository.write(preferences)
    await second.repository.write({...preferences, timeMode: 'auto'})
    expect(second.storage.writeToss).toHaveBeenCalledWith('pomo:focus-room-scene-preferences:v1', {
      ...preferences,
      timeMode: 'auto',
    })
    nativeWrite.resolve()
    await pendingWrite
  })

  it('should fall back to browser preferences when native reads fail', async () => {
    const {repository, storage} = createRepository()
    const error = new Error('unavailable')
    storage.writeWeb('pomo:focus-room-scene-preferences:v1', preferences)
    storage.readToss.mockRejectedValue(error)

    await expect(repository.read()).resolves.toEqual(preferences)
    expect(storage.writeToss).not.toHaveBeenCalled()
  })

  it('should preserve browser preferences after a native write fails', async () => {
    const {repository, storage} = createRepository()
    storage.writeToss.mockRejectedValueOnce(new Error('unavailable'))

    await expect(repository.write(preferences)).resolves.toBeUndefined()
    await expect(repository.read()).resolves.toEqual(preferences)
  })

  it('should recover the native queue after a failed explicit write', async () => {
    const {repository, storage} = createRepository()
    storage.writeToss.mockRejectedValueOnce(new Error('unavailable'))
    await expect(repository.write(preferences)).resolves.toBeUndefined()
    await repository.write({...preferences, timeMode: 'auto'})
    expect(storage.writeToss).toHaveBeenLastCalledWith('pomo:focus-room-scene-preferences:v1', {
      ...preferences,
      timeMode: 'auto',
    })
  })
})
