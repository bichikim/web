/** @vitest-environment node */

import {expect, it, vi} from 'vitest'

import {
  createPPlaylistStorage,
  type PlaylistStorageAdapter,
  type StoredPlaylist,
} from '../playlist-storage'

const createStoredPlaylist = (trackIds: readonly string[], savedAt: number): StoredPlaylist => ({
  savedAt,
  trackIds,
  version: 1,
})

const createStorage = ({
  tossPlaylist = null,
  usesTossStorage = false,
  webPlaylist = null,
}: {
  readonly tossPlaylist?: StoredPlaylist | null
  readonly usesTossStorage?: boolean
  readonly webPlaylist?: StoredPlaylist | null
} = {}) => {
  let currentWebPlaylist = webPlaylist
  const storage = {
    readToss: vi.fn<() => Promise<StoredPlaylist | null>>().mockResolvedValue(tossPlaylist),
    readWeb: vi.fn(() => currentWebPlaylist),
    usesTossStorage: () => usesTossStorage,
    writeToss: vi.fn<(playlist: StoredPlaylist) => Promise<void>>().mockResolvedValue(),
    writeWeb: vi.fn<PlaylistStorageAdapter['writeWeb']>((playlist) => {
      currentWebPlaylist = playlist
      return null
    }),
  } satisfies PlaylistStorageAdapter

  return storage
}

it('should persist and restore a browser playlist in order', async () => {
  const storage = createStorage()
  const playlistStorage = createPPlaylistStorage(storage, {now: () => 20})

  await playlistStorage.write(['three', 'one'])

  await expect(playlistStorage.read()).resolves.toEqual(['three', 'one'])
  expect(storage.writeWeb).toHaveBeenCalledWith(createStoredPlaylist(['three', 'one'], 20))
})

it('should preserve an explicitly emptied playlist', async () => {
  const playlistStorage = createPPlaylistStorage(createStorage(), {now: () => 20})

  await playlistStorage.write([])

  await expect(playlistStorage.read()).resolves.toEqual([])
})

it('should tolerate web storage write failures', async () => {
  const storage = createStorage()
  storage.writeWeb.mockReturnValue(new DOMException('Storage is unavailable', 'SecurityError'))
  const playlistStorage = createPPlaylistStorage(storage, {now: () => 20})

  await expect(playlistStorage.write(['one'])).resolves.toBeUndefined()
  await expect(playlistStorage.read()).resolves.toBeNull()
})

it('should select and cache the newer Toss playlist', async () => {
  const tossPlaylist = createStoredPlaylist(['toss'], 15)
  const storage = createStorage({
    tossPlaylist,
    usesTossStorage: true,
    webPlaylist: createStoredPlaylist(['web'], 10),
  })
  const playlistStorage = createPPlaylistStorage(storage, {now: () => 20})

  await expect(playlistStorage.read()).resolves.toEqual(['toss'])
  expect(storage.writeWeb).toHaveBeenCalledWith(tossPlaylist)
})

it('should prefer and repair Toss storage from an equally recent browser playlist', async () => {
  const webPlaylist = createStoredPlaylist(['web'], 15)
  const storage = createStorage({
    tossPlaylist: createStoredPlaylist(['toss'], 15),
    usesTossStorage: true,
    webPlaylist,
  })
  const playlistStorage = createPPlaylistStorage(storage, {now: () => 20})

  await expect(playlistStorage.read()).resolves.toEqual(['web'])
  await vi.waitFor(() => expect(storage.writeToss).toHaveBeenCalledWith(webPlaylist))
})

it('should report a Toss repair failure through the injected error reporter', async () => {
  const repairError = new Error('Toss storage is unavailable')
  const storage = createStorage({
    tossPlaylist: createStoredPlaylist(['toss'], 10),
    usesTossStorage: true,
    webPlaylist: createStoredPlaylist(['web'], 15),
  })
  storage.writeToss.mockRejectedValue(repairError)
  const reportError = vi.fn()
  const playlistStorage = createPPlaylistStorage(storage, {now: () => 20}, reportError)

  await expect(playlistStorage.read()).resolves.toEqual(['web'])
  await vi.waitFor(() => expect(reportError).toHaveBeenCalledWith(repairError))
})

it('should restore a Toss playlist when the browser copy is absent', async () => {
  const storage = createStorage({
    tossPlaylist: createStoredPlaylist(['toss'], 15),
    usesTossStorage: true,
  })
  const playlistStorage = createPPlaylistStorage(storage, {now: () => 20})

  await expect(playlistStorage.read()).resolves.toEqual(['toss'])
})

it('should fall back to the browser playlist when Toss storage cannot be read', async () => {
  const storage = createStorage({
    usesTossStorage: true,
    webPlaylist: createStoredPlaylist(['web'], 10),
  })
  storage.readToss.mockRejectedValue(new Error('Toss storage is unavailable'))
  const playlistStorage = createPPlaylistStorage(storage, {now: () => 20})

  await expect(playlistStorage.read()).resolves.toEqual(['web'])
})

it('should return no playlist when both storage reads are unavailable', async () => {
  const storage = createStorage({usesTossStorage: true})
  storage.readToss.mockRejectedValue(new Error('Toss storage is unavailable'))
  const playlistStorage = createPPlaylistStorage(storage, {now: () => 20})

  await expect(playlistStorage.read()).resolves.toBeNull()
})

it('should not overwrite a playlist changed while Toss storage is being read', async () => {
  let completeRead: ((playlist: StoredPlaylist | null) => void) | undefined
  const storage = createStorage({
    usesTossStorage: true,
    webPlaylist: createStoredPlaylist(['web'], 15),
  })
  storage.readToss.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        completeRead = resolve
      }),
  )
  const playlistStorage = createPPlaylistStorage(storage, {now: () => 20})
  const playlistRequest = playlistStorage.read()

  await playlistStorage.write(['latest'])
  completeRead?.(createStoredPlaylist(['stale'], 10))

  await expect(playlistRequest).resolves.toEqual(['latest'])
})

it('should ignore a Toss read after a web write failure', async () => {
  let completeRead: ((playlist: StoredPlaylist | null) => void) | undefined
  const storage = createStorage({usesTossStorage: true})
  storage.readToss.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        completeRead = resolve
      }),
  )
  storage.writeWeb.mockReturnValueOnce(new DOMException('Storage is unavailable', 'SecurityError'))
  const playlistStorage = createPPlaylistStorage(storage, {now: () => 20})
  const playlistRequest = playlistStorage.read()

  await playlistStorage.write(['latest'])
  completeRead?.(createStoredPlaylist(['stale'], 10))

  await expect(playlistRequest).resolves.toBeNull()
})

it('should isolate a pending read from writes made through another storage instance', async () => {
  let completeRead: ((playlist: StoredPlaylist | null) => void) | undefined
  const firstStorage = createStorage({
    usesTossStorage: true,
    webPlaylist: createStoredPlaylist(['web'], 10),
  })
  firstStorage.readToss.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        completeRead = resolve
      }),
  )
  const firstPlaylistStorage = createPPlaylistStorage(firstStorage, {now: () => 20})
  const secondPlaylistStorage = createPPlaylistStorage(createStorage({usesTossStorage: true}), {
    now: () => 20,
  })
  const playlistRequest = firstPlaylistStorage.read()

  await secondPlaylistStorage.write(['second-instance'])
  completeRead?.(createStoredPlaylist(['toss'], 15))

  await expect(playlistRequest).resolves.toEqual(['toss'])
})

it('should keep latest Toss writers independent for each storage instance', async () => {
  let completeFirstWrite: (() => void) | undefined
  const firstStorage = createStorage({usesTossStorage: true})
  firstStorage.writeToss.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        completeFirstWrite = resolve
      }),
  )
  const secondStorage = createStorage({usesTossStorage: true})
  const firstPlaylistStorage = createPPlaylistStorage(firstStorage, {now: () => 20})
  const secondPlaylistStorage = createPPlaylistStorage(secondStorage, {now: () => 20})
  const firstWrite = firstPlaylistStorage.write(['first'])

  await vi.waitFor(() => expect(firstStorage.writeToss).toHaveBeenCalledOnce())
  const secondWrite = secondPlaylistStorage.write(['second'])

  await vi.waitFor(() => expect(secondStorage.writeToss).toHaveBeenCalledOnce())
  completeFirstWrite?.()
  await Promise.all([firstWrite, secondWrite])
})

it('should persist a playlist to Toss storage when the bridge is available', async () => {
  const storage = createStorage({usesTossStorage: true})
  const playlistStorage = createPPlaylistStorage(storage, {now: () => 20})

  await playlistStorage.write(['one', 'two'])

  expect(storage.writeToss).toHaveBeenCalledWith(createStoredPlaylist(['one', 'two'], 20))
})
