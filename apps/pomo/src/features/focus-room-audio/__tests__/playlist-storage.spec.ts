/** @vitest-environment jsdom */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {readPPlaylist, writePPlaylist} from '../playlist-storage'

const storageMocks = vi.hoisted(() => ({
  getItem: vi.fn<(key: string) => Promise<string | null>>(),
  setItem: vi.fn<(key: string, value: string) => Promise<void>>(),
}))

vi.mock('@apps-in-toss/web-framework', () => ({Storage: storageMocks}))

describe('playlist-storage', () => {
  beforeEach(() => {
    localStorage.clear()
    storageMocks.getItem.mockReset()
    storageMocks.getItem.mockResolvedValue(null)
    storageMocks.setItem.mockReset()
    storageMocks.setItem.mockResolvedValue()
    vi.spyOn(Date, 'now').mockReturnValue(20)
  })

  afterEach(() => {
    Reflect.deleteProperty(window, 'ReactNativeWebView')
    vi.restoreAllMocks()
  })

  it('should persist and restore the browser playlist in order', async () => {
    await writePPlaylist(['three', 'one'])

    expect(await readPPlaylist()).toEqual(['three', 'one'])
    expect(JSON.parse(localStorage.getItem('pomo:focus-room-playlist:v1') ?? '')).toEqual({
      savedAt: 20,
      trackIds: ['three', 'one'],
      version: 1,
    })
  })

  it('should preserve an explicitly emptied playlist', async () => {
    await writePPlaylist([])

    expect(await readPPlaylist()).toEqual([])
  })

  it.each([
    ['malformed JSON', '{invalid'],
    ['duplicate track IDs', JSON.stringify({savedAt: 10, trackIds: ['one', 'one'], version: 1})],
    ['an unsupported version', JSON.stringify({savedAt: 10, trackIds: ['one'], version: 2})],
  ])('should ignore %s', async (_label, storedValue) => {
    localStorage.setItem('pomo:focus-room-playlist:v1', storedValue)

    expect(await readPPlaylist()).toBeNull()
  })

  it('should tolerate browser storage write failures', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage is unavailable', 'SecurityError')
    })

    await expect(writePPlaylist(['one'])).resolves.toBeUndefined()
    expect(await readPPlaylist()).toBeNull()
  })

  it('should select and cache the newer native playlist', async () => {
    Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
    localStorage.setItem(
      'pomo:focus-room-playlist:v1',
      JSON.stringify({savedAt: 10, trackIds: ['web'], version: 1}),
    )
    storageMocks.getItem.mockResolvedValue(
      JSON.stringify({savedAt: 15, trackIds: ['native'], version: 1}),
    )

    expect(await readPPlaylist()).toEqual(['native'])
    expect(JSON.parse(localStorage.getItem('pomo:focus-room-playlist:v1') ?? '')).toEqual({
      savedAt: 15,
      trackIds: ['native'],
      version: 1,
    })
  })

  it('should prefer the browser playlist when it is at least as recent', async () => {
    Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
    localStorage.setItem(
      'pomo:focus-room-playlist:v1',
      JSON.stringify({savedAt: 15, trackIds: ['web'], version: 1}),
    )
    storageMocks.getItem.mockResolvedValue(
      JSON.stringify({savedAt: 15, trackIds: ['native'], version: 1}),
    )

    expect(await readPPlaylist()).toEqual(['web'])
  })

  it('should repair stale native storage from the newer browser playlist', async () => {
    Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
    localStorage.setItem(
      'pomo:focus-room-playlist:v1',
      JSON.stringify({savedAt: 15, trackIds: ['web'], version: 1}),
    )
    storageMocks.getItem.mockResolvedValue(
      JSON.stringify({savedAt: 10, trackIds: ['native'], version: 1}),
    )

    expect(await readPPlaylist()).toEqual(['web'])
    await vi.waitFor(() => expect(storageMocks.setItem).toHaveBeenCalledOnce())
    const [storageKey, storedValue] = storageMocks.setItem.mock.lastCall ?? []
    expect(storageKey).toBe('pomo:focus-room-playlist:v1')
    expect(JSON.parse(storedValue ?? '')).toMatchObject({trackIds: ['web']})
  })

  it('should restore native storage when the browser copy is absent', async () => {
    Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
    storageMocks.getItem.mockResolvedValue(
      JSON.stringify({savedAt: 15, trackIds: ['native'], version: 1}),
    )

    expect(await readPPlaylist()).toEqual(['native'])
  })

  it('should fall back to the browser playlist when native storage cannot be read', async () => {
    Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
    localStorage.setItem(
      'pomo:focus-room-playlist:v1',
      JSON.stringify({savedAt: 10, trackIds: ['web'], version: 1}),
    )
    storageMocks.getItem.mockRejectedValue(new Error('Native storage is unavailable'))

    expect(await readPPlaylist()).toEqual(['web'])
  })

  it('should not overwrite a playlist changed while native storage is being read', async () => {
    Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
    let completeRead: ((value: string | null) => void) | undefined
    storageMocks.getItem.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          completeRead = resolve
        }),
    )
    const playlistRequest = readPPlaylist()

    await writePPlaylist(['latest'])
    completeRead?.(JSON.stringify({savedAt: 10, trackIds: ['stale'], version: 1}))

    expect(await playlistRequest).toEqual(['latest'])
    expect(JSON.parse(localStorage.getItem('pomo:focus-room-playlist:v1') ?? '')).toMatchObject({
      trackIds: ['latest'],
    })
  })

  it('should persist the playlist to native storage in Apps in Toss', async () => {
    Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})

    await writePPlaylist(['one', 'two'])

    const [storageKey, storedValue] = storageMocks.setItem.mock.lastCall ?? []
    expect(storageKey).toBe('pomo:focus-room-playlist:v1')
    expect(JSON.parse(storedValue ?? '')).toEqual({
      savedAt: 20,
      trackIds: ['one', 'two'],
      version: 1,
    })
  })
})
