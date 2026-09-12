/** @vitest-environment jsdom */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {readPPlayback, stopPPlayback, writePPlayback} from '../playback-storage'

const storageMocks = vi.hoisted(() => ({
  getItem: vi.fn<(key: string) => Promise<string | null>>(),
  setItem: vi.fn<(key: string, value: string) => Promise<void>>(),
}))

vi.mock('@apps-in-toss/web-framework', () => ({
  Storage: storageMocks,
}))

describe('playback-storage', () => {
  beforeEach(() => {
    localStorage.clear()
    storageMocks.getItem.mockReset()
    storageMocks.setItem.mockReset()
  })

  afterEach(() => {
    Reflect.deleteProperty(window, 'ReactNativeWebView')
    vi.restoreAllMocks()
  })

  it('should persist playback in browser storage', async () => {
    const startedAt = Date.now()
    await writePPlayback({isPlaying: true, positionSeconds: 12, trackId: 'track-one'})
    const stored = JSON.parse(localStorage.getItem('pomo:focus-room-playback:v1') ?? 'null')
    expect(stored.savedAt).toBeGreaterThanOrEqual(startedAt)
    expect(stored.savedAt).toBeLessThanOrEqual(Date.now())

    expect(await readPPlayback()).toEqual({
      isPlaying: true,
      positionSeconds: 12,
      trackId: 'track-one',
    })
  })

  it('should stop the playback persisted through the public exports', async () => {
    await writePPlayback({isPlaying: true, positionSeconds: 12, trackId: 'track-one'})
    await stopPPlayback()
    await expect(readPPlayback()).resolves.toEqual({
      isPlaying: false,
      positionSeconds: 12,
      trackId: 'track-one',
    })
  })

  it('should ignore malformed playback data', async () => {
    localStorage.setItem('pomo:focus-room-playback:v1', '{invalid')

    expect(await readPPlayback()).toBeNull()
  })

  it('should ignore playback data that does not satisfy the stored schema', async () => {
    localStorage.setItem(
      'pomo:focus-room-playback:v1',
      JSON.stringify({positionSeconds: -1, savedAt: 10, trackId: ''}),
    )

    expect(await readPPlayback()).toBeNull()
  })

  it('should tolerate browser storage write failures', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage is unavailable', 'SecurityError')
    })

    await expect(
      writePPlayback({isPlaying: true, positionSeconds: 12, trackId: 'track-one'}),
    ).resolves.toBeUndefined()
    expect(await readPPlayback()).toBeNull()
  })

  it('should treat playback saved before autoplay support as paused', async () => {
    localStorage.setItem(
      'pomo:focus-room-playback:v1',
      JSON.stringify({positionSeconds: 4, savedAt: 10, trackId: 'legacy-track'}),
    )

    expect(await readPPlayback()).toEqual({
      isPlaying: false,
      positionSeconds: 4,
      trackId: 'legacy-track',
    })
  })

  it('should select the latest app or browser copy', async () => {
    Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
    localStorage.setItem(
      'pomo:focus-room-playback:v1',
      JSON.stringify({positionSeconds: 4, savedAt: 10, trackId: 'web-track'}),
    )
    storageMocks.getItem.mockResolvedValue(
      JSON.stringify({positionSeconds: 8, savedAt: 15, trackId: 'native-track'}),
    )

    expect(await readPPlayback()).toMatchObject({
      positionSeconds: 8,
      trackId: 'native-track',
    })

    await writePPlayback({isPlaying: true, positionSeconds: 9, trackId: 'latest-track'})
    const [storageKey, storedValue] = storageMocks.setItem.mock.calls[0] ?? []
    expect(storageKey).toBe('pomo:focus-room-playback:v1')
    expect(JSON.parse(storedValue ?? '')).toEqual({
      isPlaying: true,
      positionSeconds: 9,
      savedAt: expect.any(Number),
      trackId: 'latest-track',
    })
  })
})
