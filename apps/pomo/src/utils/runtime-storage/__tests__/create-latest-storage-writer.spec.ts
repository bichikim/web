import {expect, it, vi} from 'vitest'
import {createLatestStorageWriter} from '../create-latest-storage-writer'

it('should bind the storage key while forwarding each value', async () => {
  const writeToss = vi.fn<(key: string, value: unknown) => Promise<void>>().mockResolvedValue()
  const write = createLatestStorageWriter('settings', writeToss)
  await write(null)
  await write({enabled: true})
  expect(writeToss.mock.calls).toEqual([
    ['settings', null],
    ['settings', {enabled: true}],
  ])
})

it('should support synchronous storage and preserve thrown errors as rejections', async () => {
  const storage = new Map<string, unknown>()
  const write = createLatestStorageWriter('settings', (key, value) => {
    storage.set(key, value)
  })
  await write(false)
  expect(storage.get('settings')).toBe(false)
  const error = new Error('write blocked')
  const failing = createLatestStorageWriter('settings', () => {
    throw error
  })
  await expect(failing(true)).rejects.toBe(error)
})
