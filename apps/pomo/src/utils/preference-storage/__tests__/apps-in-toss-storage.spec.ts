import {beforeEach, expect, it, vi} from 'vitest'
import {appsInTossStorage} from '../apps-in-toss-storage'

const storage = vi.hoisted(() => ({getItem: vi.fn(), setItem: vi.fn()}))
vi.mock('@apps-in-toss/web-framework', () => ({Storage: storage}))
beforeEach(() => vi.clearAllMocks())

it('should read decoded preferences from Apps in Toss storage', async () => {
  storage.getItem.mockResolvedValue('25')
  expect(await appsInTossStorage.read('setting')).toBe(25)
  expect(storage.getItem).toHaveBeenCalledWith('setting')
})

it('should serialize writes and return null when persistence completes', async () => {
  storage.setItem.mockResolvedValue(undefined)
  expect(await appsInTossStorage.write('setting', {value: 25})).toBeNull()
  expect(storage.setItem).toHaveBeenCalledWith('setting', '{"value":25}')
})

it('should return write failures for the provider to report', async () => {
  const failure = new Error('bridge unavailable')
  storage.setItem.mockRejectedValue(failure)
  expect(await appsInTossStorage.write('setting', 25)).toBe(failure)
})
