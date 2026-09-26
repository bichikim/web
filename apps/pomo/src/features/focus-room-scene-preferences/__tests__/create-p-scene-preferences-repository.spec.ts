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

  it('should keep a newer write when a native read completes late', async () => {
    const {repository, storage} = createRepository()
    const nativeRead = Promise.withResolvers<unknown>()
    const stalePreferences = {activity: 'reading', gaze: 'focused', timeMode: 'day'} as const
    storage.readToss.mockReturnValue(nativeRead.promise)

    const pendingRead = repository.read()
    await repository.write(preferences)
    nativeRead.resolve(stalePreferences)

    await expect(pendingRead).resolves.toEqual(preferences)
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

  it('should restore native preferences when browser marker reads fail', async () => {
    const writeWeb = vi.fn()
    const repository = createPScenePreferencesRepository({
      storage: {
        readToss: vi.fn(async () => preferences),
        readWeb: () => {
          throw new Error('browser unavailable')
        },
        usesTossStorage: () => true,
        writeToss: vi.fn(async () => undefined),
        writeWeb,
      },
    })

    await expect(repository.read()).resolves.toEqual(preferences)
    expect(writeWeb).toHaveBeenCalledWith('pomo:focus-room-scene-preferences:v1', preferences)
  })

  it('should preserve browser preferences after a native write fails', async () => {
    const {repository, storage} = createRepository()
    storage.writeToss.mockRejectedValueOnce(new Error('unavailable'))

    await expect(repository.write(preferences)).resolves.toBeUndefined()
    await expect(repository.read()).resolves.toEqual(preferences)
  })

  it('should preserve browser preferences after a native write fails and the repository reloads', async () => {
    const values = new Map<string, unknown>()
    const stalePreferences = {
      activity: 'reading',
      gaze: 'focused',
      timeMode: 'day',
    } as const
    let nativePreferences: unknown = stalePreferences
    let shouldFailNativeWrite = true
    const readToss = vi.fn(async () => nativePreferences)
    const writeToss = vi.fn(async (_key: string, value: unknown) => {
      if (shouldFailNativeWrite) {
        shouldFailNativeWrite = false
        throw new Error('unavailable')
      }
      nativePreferences = value
    })
    const createRepositoryFromStorage = () =>
      createPScenePreferencesRepository({
        storage: {
          readToss,
          readWeb: (key: string) => values.get(key) ?? null,
          usesTossStorage: () => true,
          writeToss,
          writeWeb: (key: string, value: unknown) => {
            values.set(key, value)
          },
        },
      })
    const repository = createRepositoryFromStorage()

    await expect(repository.read()).resolves.toEqual(stalePreferences)
    await repository.write(preferences)

    return expect(createRepositoryFromStorage().read())
      .resolves.toEqual(preferences)
      .then(() => {
        expect(nativePreferences).toEqual(stalePreferences)
        expect(readToss).toHaveBeenCalledOnce()
      })
  })

  it('should keep browser preferences while native write recovery is pending', async () => {
    const {repository, storage} = createRepository()
    const initialNativePreferences = {
      activity: 'reading',
      gaze: 'focused',
      timeMode: 'day',
    } as const
    const recoveredNativePreferences = {
      activity: 'writing',
      gaze: 'user',
      timeMode: 'auto',
    } as const
    storage.readToss.mockResolvedValueOnce(initialNativePreferences)

    await expect(repository.read()).resolves.toEqual(initialNativePreferences)
    storage.writeToss.mockRejectedValueOnce(new Error('unavailable'))
    await repository.write(preferences)
    storage.readToss.mockResolvedValueOnce(recoveredNativePreferences)

    await expect(repository.read()).resolves.toEqual(preferences)
    expect(storage.readToss).toHaveBeenCalledTimes(1)
  })

  it('should not restore stale native preferences after a failed write in the same session', async () => {
    const values = new Map<string, unknown>()
    const stalePreferences = {
      activity: 'reading',
      gaze: 'focused',
      timeMode: 'day',
    } as const
    const storage = {
      readToss: vi.fn(async () => stalePreferences),
      readWeb: (key: string) => values.get(key) ?? null,
      usesTossStorage: () => true,
      writeToss: vi.fn(async () => {
        throw new Error('unavailable')
      }),
      writeWeb: (key: string, value: unknown) => {
        values.set(key, value)
      },
    } satisfies PScenePreferencesStorage
    const repository = createPScenePreferencesRepository({storage})

    await repository.write(preferences)
    await expect(repository.read()).resolves.toEqual(preferences)
    expect(values.get('pomo:focus-room-scene-preferences:native-write-failure:v1')).toBe(true)
  })

  it('should preserve browser preferences when a native read races with a failed native write', async () => {
    const values = new Map<string, unknown>()
    const stalePreferences = {
      activity: 'reading',
      gaze: 'focused',
      timeMode: 'day',
    } as const
    const nativeRead = Promise.withResolvers<unknown>()
    const readToss = vi.fn(() => nativeRead.promise)
    const writeToss = vi.fn(async () => {
      throw new Error('unavailable')
    })
    const repository = createPScenePreferencesRepository({
      storage: {
        readToss,
        readWeb: (key: string) => values.get(key) ?? null,
        usesTossStorage: () => true,
        writeToss,
        writeWeb: (key: string, value: unknown) => {
          values.set(key, value)
        },
      },
    })

    const pendingRead = repository.read()
    await repository.write(preferences)
    nativeRead.resolve(stalePreferences)

    await expect(pendingRead).resolves.toEqual(preferences)
    expect(values.get('pomo:focus-room-scene-preferences:v1')).toEqual(preferences)
    expect(values.get('pomo:focus-room-scene-preferences:native-write-failure:v1')).toBe(true)
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
