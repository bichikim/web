/** @vitest-environment jsdom */
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {
  hasNativeStorageBridge,
  readTossStorageJson,
  writeTossStorageJson,
} from 'src/utils/runtime-storage'
import {readFocusRoomEntryHistory, writeFocusRoomEntryHistory} from '../features/focus-room-entry-history'

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

const HISTORY_KEY = 'pomo:focus-room-entry-history:v1'

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  vi.mocked(hasNativeStorageBridge).mockReturnValue(true)
  vi.mocked(readTossStorageJson).mockResolvedValue(true)
  vi.mocked(writeTossStorageJson).mockResolvedValue()
})

describe('focus room entry history native-only persistence', () => {
  it('should remember a prior entry on web-only reads after native persist succeeded without web storage', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })

    await writeFocusRoomEntryHistory()

    expect(await readFocusRoomEntryHistory()).toBe(true)
    expect(localStorage.getItem(HISTORY_KEY)).toBeNull()

    vi.mocked(hasNativeStorageBridge).mockReturnValue(false)
    vi.mocked(readTossStorageJson).mockResolvedValue(null)

    expect(await readFocusRoomEntryHistory()).toBe(true)
  })
})
