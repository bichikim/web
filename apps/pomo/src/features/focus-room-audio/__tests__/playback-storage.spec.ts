/** @vitest-environment jsdom */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {readPPlayback, writePPlayback} from '../playback-storage'

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
    vi.spyOn(Date, 'now').mockReturnValue(20)
  })

  afterEach(() => {
    Reflect.deleteProperty(window, 'ReactNativeWebView')
    vi.restoreAllMocks()
  })

  it('should persist playback in browser storage', async () => {
    await writePPlayback({isPlaying: true, positionSeconds: 12, trackId: 'track-one'})

    expect(await readPPlayback()).toEqual({
      isPlaying: true,
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

  it('should return null after browser playback storage is removed', async () => {
    await writePPlayback({isPlaying: true, positionSeconds: 12, trackId: 'track-one'})
    localStorage.removeItem('pomo:focus-room-playback:v1')

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
      savedAt: 20,
      trackId: 'latest-track',
    })
  })

  it('should restore native playback when browser storage is empty', async () => {
    Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
    storageMocks.getItem.mockResolvedValue(
      JSON.stringify({
        isPlaying: true,
        positionSeconds: 8,
        savedAt: 15,
        trackId: 'native-track',
      }),
    )

    expect(await readPPlayback()).toEqual({
      isPlaying: true,
      positionSeconds: 8,
      trackId: 'native-track',
    })
  })

  it('should keep browser playback when native storage is empty', async () => {
    Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
    localStorage.setItem(
      'pomo:focus-room-playback:v1',
      JSON.stringify({
        isPlaying: true,
        positionSeconds: 4,
        savedAt: 10,
        trackId: 'web-track',
      }),
    )
    storageMocks.getItem.mockResolvedValue(null)

    expect(await readPPlayback()).toEqual({
      isPlaying: true,
      positionSeconds: 4,
      trackId: 'web-track',
    })
  })

  it('should prefer browser playback when timestamps are equal', async () => {
    Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
    localStorage.setItem(
      'pomo:focus-room-playback:v1',
      JSON.stringify({
        isPlaying: true,
        positionSeconds: 4,
        savedAt: 10,
        trackId: 'web-track',
      }),
    )
    storageMocks.getItem.mockResolvedValue(
      JSON.stringify({
        isPlaying: false,
        positionSeconds: 8,
        savedAt: 10,
        trackId: 'native-track',
      }),
    )

    expect(await readPPlayback()).toEqual({
      isPlaying: true,
      positionSeconds: 4,
      trackId: 'web-track',
    })
  })

  it('should fall back to browser playback when native storage cannot be read', async () => {
    Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
    localStorage.setItem(
      'pomo:focus-room-playback:v1',
      JSON.stringify({
        isPlaying: true,
        positionSeconds: 4,
        savedAt: 10,
        trackId: 'web-track',
      }),
    )
    storageMocks.getItem.mockRejectedValue(new Error('Native storage is unavailable'))

    expect(await readPPlayback()).toEqual({
      isPlaying: true,
      positionSeconds: 4,
      trackId: 'web-track',
    })
  })

  it('should converge native storage after older writes finish last', async () => {
    Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
    const completions: Array<() => void> = []
    storageMocks.setItem.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          completions.push(resolve)
        }),
    )

    const firstWrite = writePPlayback({
      isPlaying: true,
      positionSeconds: 1,
      trackId: 'track-one',
    })
    const secondWrite = writePPlayback({
      isPlaying: false,
      positionSeconds: 2,
      trackId: 'track-two',
    })
    await vi.waitFor(() => expect(storageMocks.setItem).toHaveBeenCalledTimes(2))

    completions[1]?.()
    await secondWrite
    completions[0]?.()
    await vi.waitFor(() => {
      expect(storageMocks.setItem).toHaveBeenCalledTimes(3)
    })
    const repairedValue = storageMocks.setItem.mock.calls[2]?.[1]
    expect(JSON.parse(repairedValue ?? '')).toMatchObject({trackId: 'track-two'})
    completions[2]?.()
    await firstWrite
  })

  it('should reconverge when playback changes during a repair write', async () => {
    Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
    const completions: Array<() => void> = []
    storageMocks.setItem.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          completions.push(resolve)
        }),
    )

    const firstWrite = writePPlayback({
      isPlaying: true,
      positionSeconds: 1,
      trackId: 'track-one',
    })
    const secondWrite = writePPlayback({
      isPlaying: true,
      positionSeconds: 2,
      trackId: 'track-two',
    })
    await vi.waitFor(() => expect(storageMocks.setItem).toHaveBeenCalledTimes(2))
    completions[1]?.()
    await secondWrite
    completions[0]?.()
    await vi.waitFor(() => {
      expect(storageMocks.setItem).toHaveBeenCalledTimes(3)
    })

    const thirdWrite = writePPlayback({
      isPlaying: false,
      positionSeconds: 3,
      trackId: 'track-three',
    })
    await vi.waitFor(() => {
      expect(storageMocks.setItem).toHaveBeenCalledTimes(4)
    })
    completions[3]?.()
    await thirdWrite
    completions[2]?.()
    await vi.waitFor(() => {
      expect(storageMocks.setItem).toHaveBeenCalledTimes(5)
    })

    const repairedValue = storageMocks.setItem.mock.calls[4]?.[1]
    expect(JSON.parse(repairedValue ?? '')).toMatchObject({trackId: 'track-three'})
    completions[4]?.()
    await firstWrite
  })
})
