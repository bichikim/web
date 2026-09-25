/** @vitest-environment jsdom */
import {afterEach, expect, it, vi} from 'vitest'
import {writeTossStorageJson} from '../write-toss-storage-json'

const storageMocks = vi.hoisted(() => ({
  getItem: vi.fn<(key: string) => Promise<string | null>>(),
  setItem: vi.fn<(key: string, value: string) => Promise<void>>(),
}))

vi.mock('@apps-in-toss/web-framework', () => ({Storage: storageMocks}))

afterEach(() => {
  storageMocks.getItem.mockReset()
  storageMocks.setItem.mockReset()
})

it('should preserve existing keys and JSON format when writing to Toss storage', async () => {
  storageMocks.setItem.mockResolvedValue()

  await writeTossStorageJson('pomo:setting:v1', {enabled: true})

  expect(storageMocks.setItem).toHaveBeenCalledWith('pomo:setting:v1', '{"enabled":true}')
})

it('should persist string preferences as JSON for restoration', async () => {
  storageMocks.setItem.mockResolvedValue()

  await writeTossStorageJson('pomo:focus-room-scene-style:v1', 'scribble')

  expect(storageMocks.setItem).toHaveBeenCalledWith('pomo:focus-room-scene-style:v1', '"scribble"')
})

it('should preserve keys that contain characters normalized by unstorage', async () => {
  storageMocks.setItem.mockResolvedValue()

  await writeTossStorageJson('pomo:setting?v1', true)

  expect(storageMocks.setItem).toHaveBeenCalledWith('pomo:setting?v1', 'true')
})

it('should preserve repeated colons in an existing key', async () => {
  storageMocks.setItem.mockResolvedValue()

  await writeTossStorageJson('pomo::setting:v1', true)

  expect(storageMocks.setItem).toHaveBeenCalledWith('pomo::setting:v1', 'true')
})

it('should propagate Toss storage write failures', async () => {
  const failure = new Error('native storage unavailable')
  storageMocks.setItem.mockRejectedValue(failure)

  await expect(writeTossStorageJson('key', 3)).rejects.toBe(failure)
})

it('should reject values that cannot be serialized instead of silently skipping the write', async () => {
  await expect(writeTossStorageJson('key', undefined)).rejects.toThrow(TypeError)
  expect(storageMocks.setItem).not.toHaveBeenCalled()
})
