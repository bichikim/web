/** @vitest-environment node */

import {expect, it, vi} from 'vitest'

import {
  createPPlaylistStorage,
  type PlaylistStorageAdapter,
  type StoredPlaylist,
} from '../features/focus-room-audio/playlist-storage'

const createStoredPlaylist = (trackIds: readonly string[], savedAt: number): StoredPlaylist => ({
  savedAt,
  trackIds,
  version: 1,
})

const createSharedNativeStorage = () => {
  let nativePlaylist: StoredPlaylist | null = null
  let webPlaylist: StoredPlaylist | null = null

  const writeNative = async (playlist: StoredPlaylist) => {
    nativePlaylist = playlist
  }

  const createAdapter = (): PlaylistStorageAdapter => ({
    readToss: vi.fn(async () => nativePlaylist),
    readWeb: vi.fn(() => webPlaylist),
    usesTossStorage: () => true,
    writeToss: vi.fn(writeNative),
    writeWeb: vi.fn((playlist: StoredPlaylist) => {
      webPlaylist = playlist
      return null
    }),
  })

  return {
    clearWeb: () => {
      webPlaylist = null
    },
    createAdapter,
    getNative: () => nativePlaylist,
    writeNative,
  }
}

it('should not restore a stale native playlist after another instance wrote newer data and web cache was evicted', async () => {
  const shared = createSharedNativeStorage()
  const firstAdapter = shared.createAdapter()
  const secondAdapter = shared.createAdapter()

  const firstPending = Promise.withResolvers<void>()
  firstAdapter.writeToss.mockImplementationOnce(async (playlist) => {
    await firstPending.promise
    await shared.writeNative(playlist)
  })

  const firstStorage = createPPlaylistStorage(firstAdapter, {now: () => 100})
  const secondStorage = createPPlaylistStorage(secondAdapter, {now: () => 200})

  const firstWrite = firstStorage.write(['stale'])
  await vi.waitFor(() => expect(firstAdapter.writeToss).toHaveBeenCalledOnce())

  await secondStorage.write(['latest'])
  expect(shared.getNative()).toEqual(createStoredPlaylist(['latest'], 200))

  firstPending.resolve()
  await firstWrite
  expect(shared.getNative()).toEqual(createStoredPlaylist(['stale'], 100))

  shared.clearWeb()

  await expect(secondStorage.read()).resolves.toEqual(['latest'])
})
