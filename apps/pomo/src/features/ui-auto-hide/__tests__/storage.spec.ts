/** @vitest-environment node */
import {expect, it, vi} from 'vitest'
import {createVisibilityPreferenceRepository, type VisibilityPreferenceStorage} from '../storage'

it('should keep native repair queues independent across distinct stores', async () => {
  const blocked = Promise.withResolvers<void>()
  const storage: VisibilityPreferenceStorage = {
    readToss: async () => null,
    readWeb: () => null,
    usesNative: () => true,
    writeToss: () => blocked.promise,
    writeWeb: () => null,
  }
  const first = createVisibilityPreferenceRepository(storage)
  const writeSecond = vi.fn(async () => undefined)
  const second = createVisibilityPreferenceRepository({...storage, writeToss: writeSecond})
  const preferences = {enabled: true, seconds: 30}
  const pending = first.restoreNative(preferences)
  await expect(second.restoreNative(preferences)).resolves.toBeNull()
  expect(writeSecond).toHaveBeenCalledWith(preferences)
  blocked.resolve()
  await pending
})
