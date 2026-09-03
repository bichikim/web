import {expect, it, vi} from 'vitest'

import {createOptionResetManager, OPTION_RESET_GROUPS, type OptionResetStorage} from '../index'

const createStorage = (): OptionResetStorage => ({
  isNative: vi.fn(() => false),
  removeNative: vi.fn(async () => undefined),
  removeWeb: vi.fn(),
})

it('should reset only the storage keys owned by one option group', async () => {
  const storage = createStorage()
  const manager = createOptionResetManager({storage})

  await manager.reset('focus-room')

  expect(vi.mocked(storage.removeWeb).mock.calls.map(([key]) => key)).toEqual([
    'pomo:focus-room-scene-preferences:v1',
    'pomo:focus-room-scene-style:v1',
    'pomo:weather-preference:v2',
    'pomo:weather-preference:v1',
    'pomo:screen-saver-delay:v1',
  ])
  expect(storage.removeNative).not.toHaveBeenCalled()
})

it('should reset every option without deleting account or user-created data', async () => {
  const storage = createStorage()
  const manager = createOptionResetManager({storage})

  await manager.resetAll()

  const removedKeys = vi.mocked(storage.removeWeb).mock.calls.map(([key]) => key)
  expect(new Set(removedKeys).size).toBe(removedKeys.length)
  expect(removedKeys).toHaveLength(
    OPTION_RESET_GROUPS.reduce((total, group) => total + group.storageKeyCount, 0),
  )
  expect(removedKeys).not.toContain('pomo:app-session:v1')
  expect(removedKeys).not.toContain('pomo:focus-room-feed-connections:v1')
  expect(removedKeys).not.toContain('pomo:focus-room-playlist:v1')
  expect(removedKeys).not.toContain('pomo:language-learning:sentences:v1')
  expect(removedKeys).not.toContain('pomo:language-learning:words:v1')
})

it('should remove native values before their browser copies', async () => {
  const storage = createStorage()
  vi.mocked(storage.isNative).mockReturnValue(true)
  const manager = createOptionResetManager({storage})

  await manager.reset('updates')

  expect(storage.removeNative).toHaveBeenCalledWith('pomo:viewed-version-release:v1')
  expect(vi.mocked(storage.removeNative).mock.invocationCallOrder[0]).toBeLessThan(
    vi.mocked(storage.removeWeb).mock.invocationCallOrder[0],
  )
})

it('should preserve browser copies when native reset fails', async () => {
  const storage = createStorage()
  vi.mocked(storage.isNative).mockReturnValue(true)
  vi.mocked(storage.removeNative).mockRejectedValue(new Error('native unavailable'))
  const manager = createOptionResetManager({storage})

  await expect(manager.reset('updates')).rejects.toThrow('Failed to reset Pomo options.')
  expect(storage.removeWeb).not.toHaveBeenCalled()
})
