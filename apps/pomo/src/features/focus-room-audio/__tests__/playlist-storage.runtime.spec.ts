/** @vitest-environment jsdom */
import {beforeEach, expect, it} from 'vitest'
import {
  playlistPreference,
  readPPlaylist,
  readPPlaylistWithEntryIds,
  writePPlaylist,
  writePPlaylistWithEntryIds,
} from '../playlist-storage'

const STORAGE_KEY = 'pomo:focus-room-playlist:v1'

beforeEach(() => {
  localStorage.clear()
})

it.each([
  ['malformed JSON', '{invalid'],
  ['an unsupported version', JSON.stringify({savedAt: 10, trackIds: ['one'], version: 2})],
])('should reject %s through the runtime storage adapter', async (_label, storedValue) => {
  localStorage.setItem(STORAGE_KEY, storedValue)
  expect(await readPPlaylist()).toBeNull()
})

it('should preserve duplicate track IDs through the runtime storage adapter', async () => {
  const trackIds = ['one', 'one']

  await writePPlaylist(trackIds)

  expect(await readPPlaylist()).toEqual(trackIds)
  expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '')).toEqual({
    savedAt: expect.any(Number),
    trackIds,
    version: 1,
  })
})

it('should migrate a legacy playlist by adding occurrence IDs only on the next write', async () => {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({savedAt: 10, trackIds: ['one', 'one'], version: 1}),
  )

  await expect(readPPlaylistWithEntryIds()).resolves.toEqual({trackIds: ['one', 'one']})
  expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '')).toEqual({
    savedAt: 10,
    trackIds: ['one', 'one'],
    version: 1,
  })

  await writePPlaylistWithEntryIds(['one', 'one'], ['first-entry', 'second-entry'])

  await expect(readPPlaylistWithEntryIds()).resolves.toEqual({
    entryIds: ['first-entry', 'second-entry'],
    trackIds: ['one', 'one'],
  })
})

it('should salvage legacy track IDs when stored entry identity is malformed', async () => {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      entryIds: ['same', 'same'],
      savedAt: 10,
      trackIds: ['one', 'one'],
      version: 1,
    }),
  )

  await expect(readPPlaylistWithEntryIds()).resolves.toEqual({trackIds: ['one', 'one']})
  await expect(readPPlaylist()).resolves.toEqual(['one', 'one'])
})

it('should expose stable entry IDs through the playlist preference adapter', async () => {
  const savedPlaylist = {
    entryIds: ['first', 'second'],
    savedAt: 10,
    trackIds: ['one', 'one'],
    version: 1,
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(savedPlaylist))

  await expect(playlistPreference.storage.read()).resolves.toEqual({
    entryIds: ['first', 'second'],
    trackIds: ['one', 'one'],
  })
})

it('should persist and restore ordered tracks through the default runtime adapter', async () => {
  await writePPlaylist(['three', 'one'])
  expect(await readPPlaylist()).toEqual(['three', 'one'])
  expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '')).toEqual({
    savedAt: expect.any(Number),
    trackIds: ['three', 'one'],
    version: 1,
  })
})
