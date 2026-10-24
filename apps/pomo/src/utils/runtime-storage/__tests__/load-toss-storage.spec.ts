import {Storage} from '@apps-in-toss/web-framework'
import {describe, expect, it, vi} from 'vitest'
import {loadTossStorage} from '../load-toss-storage'

vi.mock('@apps-in-toss/web-framework', () => ({
  Storage: {getItem: vi.fn(), setItem: vi.fn()},
}))

describe('loadTossStorage', () => {
  it('should expose storage methods without assimilating the SDK object as a promise', async () => {
    // Devtools는 Promise 이행 과정의 then 조회를 포함해 알 수 없는 속성을 조회하면 예외를 던진다.
    Object.defineProperty(Storage, 'then', {
      configurable: true,
      get() {
        throw new Error('Storage.then is not mocked')
      },
    })
    try {
      vi.mocked(Storage.getItem).mockResolvedValue('stored')
      const storage = await loadTossStorage()
      await expect(storage.getItem('key')).resolves.toBe('stored')
      await storage.setItem('key', 'next')
      expect(Storage.getItem).toHaveBeenCalledWith('key')
      expect(Storage.setItem).toHaveBeenCalledWith('key', 'next')
      await expect(loadTossStorage()).resolves.toBe(storage)
    } finally {
      Reflect.deleteProperty(Storage, 'then')
      vi.clearAllMocks()
    }
  })
})
