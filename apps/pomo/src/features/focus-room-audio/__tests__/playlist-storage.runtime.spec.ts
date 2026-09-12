/** @vitest-environment jsdom */
import {beforeEach, expect, it} from 'vitest'
import {readPPlaylist, writePPlaylist} from '../playlist-storage'

const STORAGE_KEY = 'pomo:focus-room-playlist:v1'

beforeEach(() => {
  localStorage.clear()
})

it.each([
  ['malformed JSON', '{invalid'],
  ['duplicate track IDs', JSON.stringify({savedAt: 10, trackIds: ['one', 'one'], version: 1})],
  ['an unsupported version', JSON.stringify({savedAt: 10, trackIds: ['one'], version: 2})],
])('should reject %s through the runtime storage adapter', async (_label, storedValue) => {
  localStorage.setItem(STORAGE_KEY, storedValue)
  expect(await readPPlaylist()).toBeNull()
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
