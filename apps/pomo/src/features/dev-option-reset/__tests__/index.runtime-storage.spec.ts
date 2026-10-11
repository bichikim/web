/** @vitest-environment node */
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

vi.mock('../../focus-room-dialogue', () => ({DIALOGUE_DRAFT_KEY_PREFIX: 'draft:'}))
vi.mock('../../focus-room-entry-history', () => ({settleEntryHistoryWrites: vi.fn()}))
vi.mock('../../focus-room-dialogue/use-p-event-controller/entry-playback', () => ({
  clearEntryEventPlaybackSession: vi.fn(),
}))

const storage = {getItem: vi.fn(), removeItem: vi.fn(), setItem: vi.fn()}
const getStorage = vi.fn()
let createManager: typeof import('../index').createRuntimeOptionResetManager

beforeEach(async () => {
  vi.resetModules()
  vi.clearAllMocks()
  storage.getItem.mockResolvedValue(null)
  storage.removeItem.mockResolvedValue(undefined)
  getStorage.mockReturnValue(storage)
  const bridge = {
    get Storage() {
      return getStorage()
    },
  }
  vi.doMock('@apps-in-toss/web-framework', vi.fn().mockReturnValue(bridge))
  vi.stubGlobal('ReactNativeWebView', {})
  vi.stubGlobal('localStorage', {removeItem: vi.fn()})
  createManager = (await import('../index')).createRuntimeOptionResetManager
})

afterEach(() => {
  vi.doUnmock('@apps-in-toss/web-framework')
  vi.unstubAllGlobals()
})

describe('option reset native storage loading', () => {
  it('should load storage on demand and share initialization across reset managers', async () => {
    const first = createManager()
    const second = createManager()
    expect(getStorage).not.toHaveBeenCalled()

    await expect(Promise.all([first.reset('updates'), second.reset('updates')])).resolves.toEqual([
      {status: 'complete'},
      {status: 'complete'},
    ])

    expect(getStorage).toHaveBeenCalledOnce()
    expect(storage.getItem).toHaveBeenCalledTimes(2)
    expect(storage.removeItem).toHaveBeenCalledTimes(2)
  })

  it('should retain an initialization rejection on a later reset without reading Storage again', async () => {
    const failure = new Error('Native storage export is unavailable.')
    getStorage.mockImplementationOnce(() => {
      throw failure
    })
    const manager = createManager()

    await expect(manager.reset('updates')).rejects.toThrow('Failed to reset Pomo options.')
    await expect(manager.reset('updates')).rejects.toThrow('Failed to reset Pomo options.')

    expect(getStorage).toHaveBeenCalledOnce()
    expect(storage.getItem).not.toHaveBeenCalled()
    expect(storage.removeItem).not.toHaveBeenCalled()
  })
})
