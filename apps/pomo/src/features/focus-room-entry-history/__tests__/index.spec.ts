/** @vitest-environment jsdom */
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {
  hasNativeStorageBridge,
  readTossStorageJson,
  writeTossStorageJson,
} from 'src/utils/runtime-storage'
import {readFocusRoomEntryHistory, writeFocusRoomEntryHistory} from '..'

vi.mock('src/utils/runtime-storage', async () => {
  const actual = await vi.importActual<typeof import('src/utils/runtime-storage')>(
    'src/utils/runtime-storage',
  )
  return {
    ...actual,
    hasNativeStorageBridge: vi.fn(),
    readTossStorageJson: vi.fn(),
    writeTossStorageJson: vi.fn(),
  }
})

beforeEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
  localStorage.clear()
  sessionStorage.clear()
  vi.mocked(hasNativeStorageBridge).mockReturnValue(false)
})

describe('focus room entry history', () => {
  it('should persist entry across browser sessions', async () => {
    expect(await readFocusRoomEntryHistory()).toBe(false)
    await writeFocusRoomEntryHistory()
    sessionStorage.clear()
    expect(await readFocusRoomEntryHistory()).toBe(true)
    expect(readTossStorageJson).not.toHaveBeenCalled()
  })

  it('should ignore malformed and false records', async () => {
    localStorage.setItem('pomo:focus-room-entry-history:v1', 'broken')
    expect(await readFocusRoomEntryHistory()).toBe(false)
    localStorage.setItem('pomo:focus-room-entry-history:v1', 'false')
    expect(await readFocusRoomEntryHistory()).toBe(false)
  })

  it('should treat missing native history as a first entry', async () => {
    vi.mocked(hasNativeStorageBridge).mockReturnValue(true)
    vi.mocked(readTossStorageJson).mockResolvedValue(null)
    expect(await readFocusRoomEntryHistory()).toBe(false)
  })

  it('should read native entry history without writing a stale web copy', async () => {
    vi.mocked(hasNativeStorageBridge).mockReturnValue(true)
    vi.mocked(readTossStorageJson).mockResolvedValue(true)
    expect(await readFocusRoomEntryHistory()).toBe(true)
    expect(localStorage.getItem('pomo:focus-room-entry-history:v1')).toBeNull()
  })

  it('should persist to native storage even when web storage fails', async () => {
    vi.mocked(hasNativeStorageBridge).mockReturnValue(true)
    vi.mocked(writeTossStorageJson).mockResolvedValue()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    await expect(writeFocusRoomEntryHistory()).resolves.toBeUndefined()
    expect(writeTossStorageJson).toHaveBeenCalledWith('pomo:focus-room-entry-history:v1', true)
  })

  it('should retain the web record when native writing fails', async () => {
    vi.mocked(hasNativeStorageBridge).mockReturnValue(true)
    vi.mocked(writeTossStorageJson).mockRejectedValue(new Error('native unavailable'))
    await expect(writeFocusRoomEntryHistory()).resolves.toBeUndefined()
    expect(await readFocusRoomEntryHistory()).toBe(true)
  })

  it('should report unreadable native history and complete persistence failure', async () => {
    vi.mocked(hasNativeStorageBridge).mockReturnValue(true)
    vi.mocked(readTossStorageJson).mockRejectedValue(new Error('native unavailable'))
    await expect(readFocusRoomEntryHistory()).rejects.toThrow('native unavailable')
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.mocked(writeTossStorageJson).mockRejectedValue(new Error('native unavailable'))
    await expect(writeFocusRoomEntryHistory()).rejects.toThrow('Failed to persist')
    vi.mocked(hasNativeStorageBridge).mockReturnValue(false)
    await expect(writeFocusRoomEntryHistory()).rejects.toThrow('Failed to persist')
  })
})
