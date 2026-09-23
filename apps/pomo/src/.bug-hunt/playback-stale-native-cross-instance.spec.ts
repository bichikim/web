/** @vitest-environment node */

import {expect, it, vi} from 'vitest'

import {
  createPPlaybackStorage,
  type PlaybackStorageAdapter,
  type StoredPlaybackState,
} from '../features/focus-room-audio/playback-storage'

const createSharedNativeStorage = () => {
  let nativePlayback: StoredPlaybackState | null = null
  let webPlayback: StoredPlaybackState | null = null

  const writeNative = async (state: StoredPlaybackState) => {
    nativePlayback = state
  }

  const createAdapter = (): PlaybackStorageAdapter => ({
    readToss: vi.fn(async () => nativePlayback),
    readWeb: vi.fn(() => webPlayback),
    usesTossStorage: vi.fn(() => true),
    writeToss: vi.fn(writeNative),
    writeWeb: vi.fn((state: StoredPlaybackState) => {
      webPlayback = state
      return null
    }),
  })

  return {
    clearWeb: () => {
      webPlayback = null
    },
    createAdapter,
    getNative: () => nativePlayback,
    writeNative,
  }
}

it('should not restore stale native playback after another instance wrote newer data and web cache was evicted', async () => {
  const shared = createSharedNativeStorage()
  const firstAdapter = shared.createAdapter()
  const secondAdapter = shared.createAdapter()

  const firstPending = Promise.withResolvers<void>()
  firstAdapter.writeToss.mockImplementationOnce(async (state) => {
    await firstPending.promise
    await shared.writeNative(state)
  })

  const firstStorage = createPPlaybackStorage({now: () => 100}, firstAdapter, vi.fn())
  const secondStorage = createPPlaybackStorage({now: () => 200}, secondAdapter, vi.fn())

  const stalePlayback = {isPlaying: true, positionSeconds: 1, trackId: 'stale'}
  const latestPlayback = {isPlaying: false, positionSeconds: 9, trackId: 'latest'}

  const firstWrite = firstStorage.write(stalePlayback)
  await vi.waitFor(() => expect(firstAdapter.writeToss).toHaveBeenCalledOnce())

  await secondStorage.write(latestPlayback)
  expect(shared.getNative()).toMatchObject({trackId: 'latest', savedAt: 200})

  firstPending.resolve()
  await firstWrite
  expect(shared.getNative()).toMatchObject({trackId: 'stale', savedAt: 100})

  shared.clearWeb()

  await expect(secondStorage.read()).resolves.toEqual(latestPlayback)
})
