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
  const reportError = vi.fn()
  return {
    reportError,
    repository: createPScenePreferencesRepository({reportError, storage}),
    storage,
  }
}

const preferences = {activity: 'typing', gaze: 'user', timeMode: 'night'} as const

describe('createPScenePreferencesRepository', () => {
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

  it('should report a failed native repair through the supplied boundary', async () => {
    const {repository, storage, reportError} = createRepository()
    const error = new Error('unavailable')
    storage.writeWeb('pomo:focus-room-scene-preferences:v1', preferences)
    storage.writeToss.mockRejectedValue(error)

    await expect(repository.read()).resolves.toEqual(preferences)
    await vi.waitFor(() => expect(reportError).toHaveBeenCalledWith(error))
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
