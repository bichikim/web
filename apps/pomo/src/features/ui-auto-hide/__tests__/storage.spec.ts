/** @vitest-environment node */
import {expect, it, vi} from 'vitest'
import {
  createVisibilityPreferenceRepository,
  UI_AUTO_HIDE_STORAGE_KEY,
  type VisibilityPreferenceStorage,
  visibilityPreferenceStorage,
} from '../storage'

it('should keep native repair queues independent across distinct stores', async () => {
  const blocked = Promise.withResolvers<void>()
  const preferences = {enabled: true, seconds: 30}
  const storage: VisibilityPreferenceStorage = {
    readToss: async () => null,
    readWeb: () => preferences,
    usesNative: () => true,
    writeToss: () => blocked.promise,
    writeWeb: () => null,
  }
  const first = createVisibilityPreferenceRepository(storage)
  const writeSecond = vi.fn(async () => undefined)
  const second = createVisibilityPreferenceRepository({...storage, writeToss: writeSecond})
  const pending = first.read()
  await expect(second.read()).resolves.toEqual(preferences)
  expect(writeSecond).toHaveBeenCalledWith({preferences, savedAt: 0})
  blocked.resolve()
  await pending
})

it('should explicitly reject unsupported visibility settings instead of reporting a successful write', () => {
  const result = visibilityPreferenceStorage.write(UI_AUTO_HIDE_STORAGE_KEY, {
    enabled: true,
    seconds: 1,
  })
  expect(result).toBeInstanceOf(Error)
})
