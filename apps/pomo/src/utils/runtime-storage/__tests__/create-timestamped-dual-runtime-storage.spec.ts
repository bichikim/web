import {expect, it, vi} from 'vitest'
import {createTimestampedDualRuntimeStorage} from '../create-timestamped-dual-runtime-storage'

interface StoredValue {
  readonly savedAt: number
  readonly value: string
}
it('should retain first-source precedence on ties and accept missing sources', () => {
  const storage = createTimestampedDualRuntimeStorage<StoredValue>({now: () => 10})
  const web = {savedAt: 1, value: 'web'}
  const native = {savedAt: 1, value: 'native'}
  expect(storage.selectLatest(web, native)).toBe(web)
  expect(storage.selectLatest(native, web)).toBe(native)
  expect(storage.selectLatest(null, native)).toBe(native)
  expect(storage.selectLatest(web, {...native, savedAt: 2})?.value).toBe('native')
  expect(storage.selectLatest(null, null)).toBeNull()
})
it('should stamp monotonically after observed storage time and invalidate reads synchronously', async () => {
  const storage = createTimestampedDualRuntimeStorage<StoredValue>({
    now: () => 10,
    timestamp: 'monotonic',
  })
  storage.observeSavedAt(100)
  const persist = vi.fn().mockResolvedValue(undefined)
  const writing = storage.writeStored((savedAt) => ({savedAt, value: 'first'}), persist)
  expect(storage.revision()).toBe(1)
  await writing
  await storage.writeStored((savedAt) => ({savedAt, value: 'second'}), persist)
  expect(persist.mock.calls).toEqual([
    [{savedAt: 101, value: 'first'}],
    [{savedAt: 102, value: 'second'}],
  ])
})
it('should preserve clock timestamps when monotonic mode is not requested', async () => {
  const storage = createTimestampedDualRuntimeStorage<StoredValue>({now: () => 10})
  const persist = vi.fn().mockResolvedValue(undefined)
  storage.observeSavedAt(100)
  await storage.writeStored((savedAt) => ({savedAt, value: 'clock'}), persist)
  expect(persist).toHaveBeenCalledWith({savedAt: 10, value: 'clock'})
})
it('should track rejected writes until settlement without hiding their failure from the writer', async () => {
  const storage = createTimestampedDualRuntimeStorage<StoredValue>({now: () => 10})
  const deferred = Promise.withResolvers<void>()
  const write = storage.writeStored(
    (savedAt) => ({savedAt, value: 'pending'}),
    () => deferred.promise,
  )
  const rejected = expect(write).rejects.toThrow('unavailable')
  expect(storage.hasPendingWrites()).toBe(true)
  const settling = storage.settleWrites()
  deferred.reject(new Error('unavailable'))
  await rejected
  await settling
  expect(storage.hasPendingWrites()).toBe(false)
})
it('should reject a synchronous persistence failure through the write promise', async () => {
  const storage = createTimestampedDualRuntimeStorage<StoredValue>({now: () => 10})
  await expect(
    storage.writeStored(
      (savedAt) => ({savedAt, value: 'pending'}),
      () => {
        throw new Error('unavailable')
      },
    ),
  ).rejects.toThrow('unavailable')
  expect(storage.hasPendingWrites()).toBe(false)
})
