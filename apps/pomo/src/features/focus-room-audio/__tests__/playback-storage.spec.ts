/** @vitest-environment node */

import {beforeEach, describe, expect, it, vi} from 'vitest'
import {
  createPPlaybackStorage,
  type PlaybackStorageAdapter,
  type StoredPlaybackState,
} from '../playback-storage'

interface StorageState {
  web: StoredPlaybackState | null
}

const createStorage = () => {
  const state: StorageState = {web: null}
  const adapter = {
    readToss: vi.fn<PlaybackStorageAdapter['readToss']>().mockResolvedValue(null),
    readWeb: vi.fn(() => state.web),
    usesTossStorage: vi.fn(() => false),
    writeToss: vi.fn<PlaybackStorageAdapter['writeToss']>().mockResolvedValue(),
    writeWeb: vi.fn<PlaybackStorageAdapter['writeWeb']>((value) => {
      state.web = value
      return null
    }),
  } satisfies PlaybackStorageAdapter
  return {adapter, state}
}

describe('playback-storage', () => {
  let storage: ReturnType<typeof createStorage>
  let playbackStorage: ReturnType<typeof createPPlaybackStorage>
  let currentTime: number
  beforeEach(() => {
    storage = createStorage()
    currentTime = 20
    playbackStorage = createPPlaybackStorage({now: () => currentTime}, storage.adapter, vi.fn())
  })

  it('should read the injected clock for each write and stop', async () => {
    await playbackStorage.write({isPlaying: true, positionSeconds: 12, trackId: 'track-one'})
    expect(storage.state.web).toMatchObject({savedAt: 20})

    currentTime = 30
    await playbackStorage.write({isPlaying: true, positionSeconds: 13, trackId: 'track-one'})
    expect(storage.state.web).toMatchObject({savedAt: 30})

    currentTime = 40
    await playbackStorage.stop()
    expect(storage.state.web).toMatchObject({isPlaying: false, savedAt: 40})
  })

  it('should preserve the optional playlist index during storage round trips', async () => {
    await playbackStorage.write({
      isPlaying: true,
      positionSeconds: 12,
      trackId: 'track-one',
      trackIndex: 1,
    })

    await expect(playbackStorage.read()).resolves.toEqual({
      isPlaying: true,
      positionSeconds: 12,
      trackId: 'track-one',
      trackIndex: 1,
    })
  })

  it('should return null after browser playback storage is removed', async () => {
    await playbackStorage.write({isPlaying: true, positionSeconds: 12, trackId: 'track-one'})
    storage.state.web = null

    expect(await playbackStorage.read()).toBeNull()
  })

  it('should restore native playback when browser storage is empty', async () => {
    storage.adapter.usesTossStorage.mockReturnValue(true)
    const native = {
      isPlaying: true,
      positionSeconds: 8,
      savedAt: 15,
      trackId: 'native-track',
    }
    storage.adapter.readToss.mockResolvedValue(native)

    expect(await playbackStorage.read()).toEqual({
      isPlaying: true,
      positionSeconds: 8,
      trackId: 'native-track',
    })
    expect(storage.state.web).toEqual(native)
  })

  it('should keep browser playback when native storage is empty', async () => {
    storage.adapter.usesTossStorage.mockReturnValue(true)
    storage.state.web = {
      isPlaying: true,
      positionSeconds: 4,
      savedAt: 10,
      trackId: 'web-track',
    }
    storage.adapter.readToss.mockResolvedValue(null)

    expect(await playbackStorage.read()).toEqual({
      isPlaying: true,
      positionSeconds: 4,
      trackId: 'web-track',
    })
  })

  it('should prefer browser playback when timestamps are equal', async () => {
    storage.adapter.usesTossStorage.mockReturnValue(true)
    storage.state.web = {
      isPlaying: true,
      positionSeconds: 4,
      savedAt: 10,
      trackId: 'web-track',
    }
    storage.adapter.readToss.mockResolvedValue({
      isPlaying: false,
      positionSeconds: 8,
      savedAt: 10,
      trackId: 'native-track',
    })

    expect(await playbackStorage.read()).toEqual({
      isPlaying: true,
      positionSeconds: 4,
      trackId: 'web-track',
    })
  })

  it.each([null, 100, 200])(
    'should repair native playback at timestamp %s and restore it after browser removal',
    async (savedAt) => {
      storage.adapter.usesTossStorage.mockReturnValue(true)
      const latest = {isPlaying: true, positionSeconds: 12, savedAt: 200, trackId: 'new'}
      storage.state.web = latest
      let native: StoredPlaybackState | null =
        savedAt === null ? null : {isPlaying: false, positionSeconds: 1, savedAt, trackId: 'old'}
      storage.adapter.readToss.mockImplementation(async () => native)
      storage.adapter.writeToss.mockImplementation(async (value) => {
        native = value
      })

      await expect(playbackStorage.read()).resolves.toEqual({
        isPlaying: true,
        positionSeconds: 12,
        trackId: 'new',
      })
      expect(storage.adapter.writeToss).toHaveBeenCalledWith(latest)
      storage.state.web = null
      await expect(playbackStorage.read()).resolves.toEqual({
        isPlaying: true,
        positionSeconds: 12,
        trackId: 'new',
      })
    },
  )

  it('should mirror newer native playback to web and preserve it after bridge loss', async () => {
    storage.adapter.usesTossStorage.mockReturnValue(true)
    storage.state.web = {isPlaying: false, positionSeconds: 1, savedAt: 10, trackId: 'old'}
    const latest = {
      isPlaying: true,
      positionSeconds: 12,
      savedAt: 200,
      trackId: 'new',
    }
    storage.adapter.readToss.mockResolvedValue(latest)

    await expect(playbackStorage.read()).resolves.toMatchObject({trackId: 'new'})
    expect(storage.adapter.writeToss).not.toHaveBeenCalled()
    expect(storage.adapter.writeWeb).toHaveBeenCalledWith(latest)

    storage.adapter.usesTossStorage.mockReturnValue(false)
    await expect(playbackStorage.read()).resolves.toMatchObject({trackId: 'new'})
  })

  it('should return browser playback while repair is pending and serialize a newer write', async () => {
    storage.adapter.usesTossStorage.mockReturnValue(true)
    storage.state.web = {isPlaying: true, positionSeconds: 1, savedAt: 10, trackId: 'old'}
    const repair = Promise.withResolvers<void>()
    storage.adapter.writeToss.mockReturnValueOnce(repair.promise)

    await expect(playbackStorage.read()).resolves.toMatchObject({trackId: 'old'})
    expect(storage.adapter.writeToss).toHaveBeenCalledOnce()
    const latest = {isPlaying: false, positionSeconds: 12, trackId: 'new'}
    const writing = playbackStorage.write(latest)
    expect(storage.adapter.writeToss).toHaveBeenCalledOnce()
    repair.resolve()
    await writing
    expect(storage.adapter.writeToss).toHaveBeenLastCalledWith({...latest, savedAt: 20})
  })

  it('should fall back to browser playback when native storage cannot be read', async () => {
    storage.adapter.usesTossStorage.mockReturnValue(true)
    storage.state.web = {
      isPlaying: true,
      positionSeconds: 4,
      savedAt: 10,
      trackId: 'web-track',
    }
    storage.adapter.readToss.mockRejectedValue(new Error('Native storage is unavailable'))

    expect(await playbackStorage.read()).toEqual({
      isPlaying: true,
      positionSeconds: 4,
      trackId: 'web-track',
    })
  })

  describe.each([false, true])('pending read with existing browser copy: %s', (hasBrowserCopy) => {
    it.each([
      {
        name: 'an older native snapshot with a higher timestamp',
        value: {
          isPlaying: false,
          positionSeconds: 22,
          savedAt: 100,
          trackId: 'native-track',
        },
      },
      {name: 'missing native data', value: null},
      {name: 'a native read failure', value: new Error('Native storage is unavailable')},
    ])('should return playback saved during $name', async ({value}) => {
      storage.adapter.usesTossStorage.mockReturnValue(true)
      if (hasBrowserCopy) {
        storage.state.web = {
          isPlaying: false,
          positionSeconds: 1,
          savedAt: 10,
          trackId: 'web-track',
        }
      }
      const pendingRead = Promise.withResolvers<StoredPlaybackState | null>()
      storage.adapter.readToss.mockReturnValueOnce(pendingRead.promise)
      storage.adapter.writeToss.mockResolvedValue()
      const reading = playbackStorage.read()
      await vi.waitFor(() => expect(storage.adapter.readToss).toHaveBeenCalledOnce())
      const latestPlayback = {isPlaying: true, positionSeconds: 5, trackId: 'new-track'}
      await playbackStorage.write(latestPlayback)
      if (value instanceof Error) {
        pendingRead.reject(value)
      } else {
        pendingRead.resolve(value)
      }
      await expect(reading).resolves.toEqual(latestPlayback)
      expect(storage.state.web).toEqual({
        ...latestPlayback,
        savedAt: 20,
      })
    })
  })

  it.each([false, true])(
    'should preserve native playback after a failed browser write with existing copy %s',
    async (hasBrowserCopy) => {
      storage.adapter.usesTossStorage.mockReturnValue(true)
      if (hasBrowserCopy) {
        storage.state.web = {isPlaying: false, positionSeconds: 1, savedAt: 10, trackId: 'old-web'}
      }
      const pendingRead = Promise.withResolvers<StoredPlaybackState | null>()
      storage.adapter.readToss.mockReturnValueOnce(pendingRead.promise)
      storage.adapter.writeToss.mockResolvedValue()
      const reading = playbackStorage.read()
      await vi.waitFor(() => expect(storage.adapter.readToss).toHaveBeenCalledOnce())
      storage.adapter.writeWeb.mockReturnValue(new Error('Storage is unavailable'))
      const latestPlayback = {isPlaying: true, positionSeconds: 5, trackId: 'new-native'}
      await playbackStorage.write(latestPlayback)
      pendingRead.resolve({...latestPlayback, savedAt: 20})
      await expect(reading).resolves.toEqual(latestPlayback)
    },
  )

  it('should not repair a stale read over a native write when the browser write fails', async () => {
    storage.adapter.usesTossStorage.mockReturnValue(true)
    storage.state.web = {isPlaying: false, positionSeconds: 1, savedAt: 10, trackId: 'old'}
    const pending = Promise.withResolvers<StoredPlaybackState | null>()
    storage.adapter.readToss.mockReturnValueOnce(pending.promise)
    const reading = playbackStorage.read()
    storage.adapter.writeWeb.mockReturnValue(new Error('Storage is unavailable'))
    const latest = {isPlaying: true, positionSeconds: 5, trackId: 'new'}
    await playbackStorage.write(latest)
    pending.resolve(null)
    await reading
    expect(storage.adapter.writeToss).toHaveBeenCalledExactlyOnceWith({...latest, savedAt: 20})
  })

  it('should not queue stale repair behind a native write already pending at read start', async () => {
    storage.adapter.usesTossStorage.mockReturnValue(true)
    storage.state.web = {isPlaying: false, positionSeconds: 1, savedAt: 10, trackId: 'old'}
    storage.adapter.writeWeb.mockReturnValue(new Error('Storage is unavailable'))
    const pending = Promise.withResolvers<void>()
    storage.adapter.writeToss.mockReturnValueOnce(pending.promise)
    const latest = {isPlaying: true, positionSeconds: 5, trackId: 'new'}
    const writing = playbackStorage.write(latest)
    await playbackStorage.read()
    pending.resolve()
    await writing
    expect(storage.adapter.writeToss).toHaveBeenCalledExactlyOnceWith({...latest, savedAt: 20})
  })

  it('should serialize native writes and finish with the latest value', async () => {
    storage.adapter.usesTossStorage.mockReturnValue(true)
    const completions: Array<() => void> = []
    storage.adapter.writeToss.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          completions.push(resolve)
        }),
    )

    const firstWrite = playbackStorage.write({
      isPlaying: true,
      positionSeconds: 1,
      trackId: 'track-one',
    })
    const secondWrite = playbackStorage.write({
      isPlaying: false,
      positionSeconds: 2,
      trackId: 'track-two',
    })
    await vi.waitFor(() => expect(storage.adapter.writeToss).toHaveBeenCalledTimes(1))
    completions[0]?.()
    await vi.waitFor(() => expect(storage.adapter.writeToss).toHaveBeenCalledTimes(2))
    const repairedValue = storage.adapter.writeToss.mock.calls[1]?.[0]
    expect(repairedValue).toMatchObject({trackId: 'track-two'})
    completions[1]?.()
    await Promise.all([firstWrite, secondWrite])
  })

  it('should persist playback requested while the next native write is pending', async () => {
    storage.adapter.usesTossStorage.mockReturnValue(true)
    const completions: Array<() => void> = []
    storage.adapter.writeToss.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          completions.push(resolve)
        }),
    )
    const first = playbackStorage.write({isPlaying: true, positionSeconds: 1, trackId: 'one'})
    const second = playbackStorage.write({isPlaying: true, positionSeconds: 2, trackId: 'two'})
    await vi.waitFor(() => expect(storage.adapter.writeToss).toHaveBeenCalledTimes(1))
    completions[0]?.()
    await vi.waitFor(() => expect(storage.adapter.writeToss).toHaveBeenCalledTimes(2))
    const third = playbackStorage.write({isPlaying: false, positionSeconds: 3, trackId: 'three'})
    expect(storage.adapter.writeToss).toHaveBeenCalledTimes(2)
    completions[1]?.()
    await vi.waitFor(() => expect(storage.adapter.writeToss).toHaveBeenCalledTimes(3))
    expect(storage.adapter.writeToss.mock.calls[2]?.[0]).toMatchObject({
      trackId: 'three',
    })
    completions[2]?.()
    await Promise.all([first, second, third])
  })

  it('should wait for a pending stop before restoring playback', async () => {
    storage.adapter.usesTossStorage.mockReturnValue(true)
    let resolveRead: (value: StoredPlaybackState | null) => void = () => undefined
    storage.adapter.readToss.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRead = resolve
        }),
    )
    storage.adapter.readToss.mockResolvedValue(null)
    storage.adapter.writeToss.mockResolvedValue()
    const stopping = playbackStorage.stop()
    const restoring = playbackStorage.read()
    await vi.waitFor(() => expect(storage.adapter.readToss).toHaveBeenCalled())
    resolveRead({isPlaying: true, positionSeconds: 22, savedAt: 1, trackId: 'three'})
    await stopping
    await expect(restoring).resolves.toMatchObject({
      isPlaying: false,
      positionSeconds: 22,
      trackId: 'three',
    })
  })

  it('should preserve newer playback while a stop is reading storage', async () => {
    storage.adapter.usesTossStorage.mockReturnValue(true)
    let resolveRead: (value: StoredPlaybackState | null) => void = () => undefined
    storage.adapter.readToss.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRead = resolve
        }),
    )
    storage.adapter.readToss.mockResolvedValue(null)
    storage.adapter.writeToss.mockResolvedValue()
    const stopping = playbackStorage.stop()
    await vi.waitFor(() => expect(storage.adapter.readToss).toHaveBeenCalled())
    await playbackStorage.write({isPlaying: true, positionSeconds: 5, trackId: 'new'})
    resolveRead({isPlaying: true, positionSeconds: 22, savedAt: 1, trackId: 'three'})
    await stopping
    await expect(playbackStorage.read()).resolves.toMatchObject({
      isPlaying: true,
      positionSeconds: 5,
      trackId: 'new',
    })
  })
  it('should keep a pending read independent from another instance write', async () => {
    storage.adapter.usesTossStorage.mockReturnValue(true)
    const pending = Promise.withResolvers<StoredPlaybackState | null>()
    storage.adapter.readToss.mockReturnValueOnce(pending.promise)
    const reading = playbackStorage.read()
    const other = createStorage()
    const otherPlayback = createPPlaybackStorage({now: () => 50}, other.adapter)
    await otherPlayback.write({isPlaying: true, positionSeconds: 5, trackId: 'other'})
    pending.resolve({isPlaying: true, positionSeconds: 1, savedAt: 10, trackId: 'first'})
    await expect(reading).resolves.toMatchObject({trackId: 'first'})
    expect(other.state.web).toMatchObject({savedAt: 50, trackId: 'other'})
  })

  it('should keep pending stops and stop revisions independent between instances', async () => {
    storage.adapter.usesTossStorage.mockReturnValue(true)
    const pending = Promise.withResolvers<StoredPlaybackState | null>()
    storage.adapter.readToss.mockReturnValueOnce(pending.promise)
    const stopping = playbackStorage.stop()
    await vi.waitFor(() => expect(storage.adapter.readToss).toHaveBeenCalledOnce())
    const other = createStorage()
    const otherPlayback = createPPlaybackStorage({now: () => 50}, other.adapter)
    await otherPlayback.write({isPlaying: true, positionSeconds: 5, trackId: 'other'})
    await expect(otherPlayback.read()).resolves.toMatchObject({isPlaying: true, trackId: 'other'})
    await otherPlayback.stop()
    pending.resolve({isPlaying: true, positionSeconds: 1, savedAt: 10, trackId: 'first'})
    await stopping
    expect(storage.state.web).toMatchObject({isPlaying: false, savedAt: 20, trackId: 'first'})
    expect(other.state.web).toMatchObject({isPlaying: false, savedAt: 50, trackId: 'other'})
  })

  it('should preserve latest native playback across instances sharing storage', async () => {
    let native: StoredPlaybackState | null = null
    let web: StoredPlaybackState | null = null
    const writeNative = async (value: StoredPlaybackState) => {
      native = value
    }
    const createSharedAdapter = () => {
      const adapter = {
        readToss: vi.fn(async () => native),
        readWeb: vi.fn(() => web),
        usesTossStorage: vi.fn(() => true),
        writeToss: vi.fn(writeNative),
        writeWeb: vi.fn((value) => {
          web = value
          return null
        }),
      } satisfies PlaybackStorageAdapter
      return adapter
    }
    const firstAdapter = createSharedAdapter()
    const secondAdapter = createSharedAdapter()
    const pending = Promise.withResolvers<void>()
    firstAdapter.writeToss.mockImplementationOnce(async (value) => {
      await pending.promise
      await writeNative(value)
    })

    const firstPlaybackStorage = createPPlaybackStorage({now: () => 100}, firstAdapter, vi.fn())
    const secondPlaybackStorage = createPPlaybackStorage({now: () => 200}, secondAdapter, vi.fn())
    const firstWrite = firstPlaybackStorage.write({
      isPlaying: true,
      positionSeconds: 1,
      trackId: 'stale',
    })
    await vi.waitFor(() => expect(firstAdapter.writeToss).toHaveBeenCalledOnce())

    const secondWrite = secondPlaybackStorage.write({
      isPlaying: false,
      positionSeconds: 9,
      trackId: 'latest',
    })
    await secondWrite
    expect(native).toMatchObject({savedAt: 200, trackId: 'latest'})

    pending.resolve()
    await firstWrite
    expect(native).toEqual({
      isPlaying: false,
      positionSeconds: 9,
      savedAt: 200,
      trackId: 'latest',
    })

    web = null
    await expect(secondPlaybackStorage.read()).resolves.toEqual({
      isPlaying: false,
      positionSeconds: 9,
      trackId: 'latest',
    })
  })

  it('should let another instance write while one Toss writer is pending', async () => {
    storage.adapter.usesTossStorage.mockReturnValue(true)
    const pending = Promise.withResolvers<void>()
    storage.adapter.writeToss.mockReturnValueOnce(pending.promise)
    const writing = playbackStorage.write({isPlaying: true, positionSeconds: 1, trackId: 'first'})
    const other = createStorage()
    other.adapter.usesTossStorage.mockReturnValue(true)
    const otherPlayback = createPPlaybackStorage({now: () => 50}, other.adapter)
    await otherPlayback.write({isPlaying: true, positionSeconds: 5, trackId: 'other'})
    expect(other.adapter.writeToss).toHaveBeenCalledWith({
      isPlaying: true,
      positionSeconds: 5,
      savedAt: 50,
      trackId: 'other',
    })
    pending.resolve()
    await writing
    expect(storage.adapter.writeToss).toHaveBeenCalledOnce()
  })

  it('should report failed native repair and keep returning browser playback', async () => {
    const reportError = vi.fn()
    playbackStorage = createPPlaybackStorage({now: () => currentTime}, storage.adapter, reportError)
    storage.adapter.usesTossStorage.mockReturnValue(true)
    storage.state.web = {isPlaying: true, positionSeconds: 1, savedAt: 10, trackId: 'web'}
    const error = new Error('Repair failed')
    storage.adapter.writeToss.mockRejectedValue(error)
    await expect(playbackStorage.read()).resolves.toMatchObject({trackId: 'web'})
    await vi.waitFor(() => expect(reportError).toHaveBeenCalledExactlyOnceWith(error))
  })

  it('should report each failed native operation once when writes share the queue', async () => {
    const reportError = vi.fn()
    playbackStorage = createPPlaybackStorage({now: () => currentTime}, storage.adapter, reportError)
    storage.adapter.usesTossStorage.mockReturnValue(true)
    const pending = Promise.withResolvers<void>()
    storage.adapter.writeToss.mockReturnValueOnce(pending.promise)
    const first = playbackStorage.write({isPlaying: true, positionSeconds: 1, trackId: 'one'})
    const second = playbackStorage.write({isPlaying: false, positionSeconds: 2, trackId: 'two'})
    const error = new Error('Native write failed')
    pending.reject(error)
    await expect(Promise.all([first, second])).resolves.toEqual([undefined, undefined])
    expect(reportError).toHaveBeenCalledExactlyOnceWith(error)
    expect(storage.adapter.writeToss).toHaveBeenLastCalledWith({
      isPlaying: false,
      positionSeconds: 2,
      savedAt: 20,
      trackId: 'two',
    })
  })

  it('should tolerate Toss write failure and retain the browser copy', async () => {
    storage.adapter.usesTossStorage.mockReturnValue(true)
    storage.adapter.writeToss.mockRejectedValue(new Error('Toss write failed'))
    await expect(
      playbackStorage.write({isPlaying: true, positionSeconds: 1, trackId: 'first'}),
    ).resolves.toBeUndefined()
    await expect(playbackStorage.read()).resolves.toMatchObject({trackId: 'first'})
  })
})
