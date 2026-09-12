import {expect, it, vi} from 'vitest'
import {createLatestAsyncTask} from '..'
it('should serialize writes and keep every caller pending until the latest value finishes', async () => {
  const first = Promise.withResolvers<void>()
  const last = Promise.withResolvers<void>()
  const execute = vi
    .fn<(value: unknown) => Promise<void>>()
    .mockImplementationOnce(() => first.promise)
    .mockImplementationOnce(() => last.promise)
    .mockResolvedValue()
  const writeLatest = createLatestAsyncTask(execute)
  const completed = vi.fn()
  const saving = writeLatest(1).then(completed)
  const skipped = writeLatest(2).then(completed)
  const latest = writeLatest(3).then(completed)
  await Promise.resolve()
  expect(execute).toHaveBeenCalledExactlyOnceWith(1)
  expect(completed).not.toHaveBeenCalled()
  first.resolve()
  await vi.waitFor(() => expect(execute).toHaveBeenCalledTimes(2))
  expect(execute).toHaveBeenLastCalledWith(3)
  expect(completed).not.toHaveBeenCalled()
  last.resolve()
  await Promise.all([saving, skipped, latest])
  expect(completed).toHaveBeenCalledTimes(3)
  await writeLatest(4)
  expect(execute).toHaveBeenLastCalledWith(4)
})

it('should resolve all callers when the latest write succeeds after an earlier failure', async () => {
  const pending = Promise.withResolvers<void>()
  const error = new Error('unavailable')
  const execute = vi
    .fn<(value: unknown) => Promise<void>>()
    .mockImplementationOnce(() => pending.promise)
    .mockResolvedValue()
  const writeLatest = createLatestAsyncTask(execute)
  const first = writeLatest(1)
  const latest = writeLatest(2)
  pending.reject(error)
  expect(await Promise.all([first, latest])).toEqual([undefined, undefined])
  expect(execute).toHaveBeenLastCalledWith(2)
})

it('should reject all callers with the final failure and accept later writes', async () => {
  const pending = Promise.withResolvers<void>()
  const error = new Error('final write failed')
  const execute = vi
    .fn<(value: unknown) => Promise<void>>()
    .mockImplementationOnce(() => pending.promise)
    .mockRejectedValueOnce(error)
    .mockResolvedValue()
  const writeLatest = createLatestAsyncTask(execute)
  const first = writeLatest(1)
  const skipped = writeLatest(2)
  const latest = writeLatest(3)
  const results = Promise.allSettled([first, skipped, latest])
  pending.resolve()
  expect(await results).toEqual([
    {reason: error, status: 'rejected'},
    {reason: error, status: 'rejected'},
    {reason: error, status: 'rejected'},
  ])
  expect(execute).toHaveBeenCalledTimes(2)
  expect(execute).toHaveBeenLastCalledWith(3)
  await expect(writeLatest(4)).resolves.toBeUndefined()
})

it('should keep null inputs and separate task instances', async () => {
  const pending = Promise.withResolvers<void>()
  const execute = vi
    .fn<(value: number | null) => Promise<void>>()
    .mockImplementationOnce(() => pending.promise)
    .mockResolvedValue()
  const first = createLatestAsyncTask(execute)
  const other = vi.fn<(value: number) => Promise<void>>().mockResolvedValue()
  const second = createLatestAsyncTask(other)
  const saving = first(1)
  const latest = first(null)
  await second(2)
  expect(other).toHaveBeenCalledExactlyOnceWith(2)
  pending.resolve()
  await Promise.all([saving, latest])
  expect(execute).toHaveBeenLastCalledWith(null)
})
