/** @vitest-environment jsdom */
import {afterEach, expect, it, vi} from 'vitest'

import {
  getTossRuntimeStorage,
  type TossRuntimeStorage,
} from 'src/utils/runtime-storage/get-toss-runtime-storage'
import {createMemoryMemoRepository, MEMORY_MEMOS_STORAGE_KEY} from '../repository'

vi.mock('src/utils/runtime-storage/get-toss-runtime-storage', () => ({
  getTossRuntimeStorage: vi.fn(),
}))

afterEach(() => {
  localStorage.removeItem(MEMORY_MEMOS_STORAGE_KEY)
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

it('should preserve malformed web memo JSON when the native snapshot is missing', async () => {
  const originalSnapshot = '{"memos":'
  const nativeStorage: TossRuntimeStorage = {
    read: vi.fn().mockResolvedValue(null),
    write: vi.fn().mockResolvedValue(undefined),
  }
  vi.mocked(getTossRuntimeStorage).mockReturnValue(nativeStorage)
  vi.stubGlobal('ReactNativeWebView', {})
  localStorage.setItem(MEMORY_MEMOS_STORAGE_KEY, originalSnapshot)

  await expect(createMemoryMemoRepository().read()).resolves.toEqual([])

  expect(localStorage.getItem(MEMORY_MEMOS_STORAGE_KEY)).toBe(originalSnapshot)
  expect(nativeStorage.read).toHaveBeenCalledOnce()
  expect(nativeStorage.write).not.toHaveBeenCalled()
})
