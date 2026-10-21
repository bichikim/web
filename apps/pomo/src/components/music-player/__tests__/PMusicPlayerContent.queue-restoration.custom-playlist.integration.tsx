/** @vitest-environment jsdom */

import 'fake-indexeddb/auto'

import {cleanup, render, screen, waitFor} from '@solidjs/testing-library'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {
  ALBUM_STORE_NAME,
  openCustomAlbumDatabase,
  TRACK_STORE_NAME,
  waitForTransaction,
} from 'src/features/custom-albums/database'
import {CUSTOM_TRACK_ID_PREFIX} from 'src/features/custom-albums/model'
import {playlistPreference, writePPlaylist} from 'src/features/focus-room-audio'
import {PreferenceProvider} from 'src/hooks/use-preference'

import {PAlbumLibrary} from '../../p-album-library/PAlbumLibrary'
import {PMusicPlayerContent} from '../PMusicPlayerContent'
import {getAudioElement, TRACKS} from './test-support/player-fixtures'

const storageMocks = vi.hoisted(() => ({
  getItem: vi.fn<(key: string) => Promise<string | null>>(),
  setItem: vi.fn<(key: string, value: string) => Promise<void>>(),
}))

vi.mock('media-chrome', () => ({}))
vi.mock('../../p-album-library/PAlbumLibrary', () => ({PAlbumLibrary: vi.fn()}))
vi.mock('@apps-in-toss/web-framework', () => ({Storage: storageMocks}))

const MISSING_CUSTOM_TRACK_ID = `${CUSTOM_TRACK_ID_PREFIX}deleted`

const clearCustomAlbumDatabase = async (): Promise<void> => {
  const database = await openCustomAlbumDatabase()
  const transaction = database.transaction([ALBUM_STORE_NAME, TRACK_STORE_NAME], 'readwrite')
  transaction.objectStore(ALBUM_STORE_NAME).clear()
  transaction.objectStore(TRACK_STORE_NAME).clear()
  await waitForTransaction(transaction)
}

const stubPlaylistFetch = (): void => {
  const fetchMock = vi.fn()

  fetchMock
    .mockResolvedValueOnce({
      json: () => Promise.resolve({tracks: TRACKS, version: 1}),
      ok: true,
    })
    .mockResolvedValueOnce({
      json: () => Promise.resolve({trackIds: TRACKS.map((track) => track.id), version: 1}),
      ok: true,
    })

  vi.stubGlobal('fetch', fetchMock)
}

const restoreSavedPlaylist = async (trackIds: readonly string[]): Promise<void> => {
  await writePPlaylist(trackIds)
  expect(JSON.parse(localStorage.getItem(playlistPreference.key) ?? '')).toMatchObject({
    trackIds,
    version: 1,
  })
}

const renderPlayer = () => render(() => <PMusicPlayerContent />, {wrapper: PreferenceProvider})

const waitForPlaylistRestoration = async (assertRestored: () => void): Promise<void> => {
  await waitFor(() => expect(screen.getByRole('status', {hidden: true})).toBeTruthy())
  await waitFor(() => {
    expect(screen.queryByRole('status', {hidden: true})).toBeNull()
    assertRestored()
  })
}

describe('PMusicPlayerContent saved custom playlist restoration', () => {
  beforeEach(async () => {
    await clearCustomAlbumDatabase()
    localStorage.clear()
    vi.mocked(PAlbumLibrary).mockImplementation(() => null)
    storageMocks.getItem.mockReset()
    storageMocks.getItem.mockResolvedValue(null)
    storageMocks.setItem.mockReset()
    storageMocks.setItem.mockResolvedValue()
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
    stubPlaylistFetch()
  })

  afterEach(async () => {
    cleanup()
    await clearCustomAlbumDatabase()
    Reflect.deleteProperty(globalThis, 'ReactNativeWebView')
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('should not replace a saved custom-only playlist with bundled tracks after its track is deleted', async () => {
    await restoreSavedPlaylist([MISSING_CUSTOM_TRACK_ID])
    const result = renderPlayer()
    const audio = getAudioElement(result.container)

    await waitForPlaylistRestoration(() => {
      expect(audio.getAttribute('src')).toBeNull()
      expect(
        screen.queryByRole('button', {hidden: true, name: 'One · Artist · 밀어서 삭제'}),
      ).toBeNull()
      expect(
        screen.queryByRole('button', {hidden: true, name: 'Two · Artist · 밀어서 삭제'}),
      ).toBeNull()
      expect(
        screen.queryByRole('button', {hidden: true, name: 'Three · Artist · 밀어서 삭제'}),
      ).toBeNull()
      expect(screen.getByText('집중 음악을 준비 중이에요')).toBeTruthy()
    })

    result.unmount()
  })

  it('should keep resolved bundled tracks from a mixed playlist when its custom track is deleted', async () => {
    await restoreSavedPlaylist([TRACKS[2].id, MISSING_CUSTOM_TRACK_ID])
    const result = renderPlayer()

    await waitForPlaylistRestoration(() => {
      expect(
        screen.getByRole('button', {hidden: true, name: 'Three · Artist · 밀어서 삭제'}),
      ).toBeTruthy()
      expect(
        screen.queryByRole('button', {hidden: true, name: 'One · Artist · 밀어서 삭제'}),
      ).toBeNull()
      expect(
        screen.queryByRole('button', {hidden: true, name: 'Two · Artist · 밀어서 삭제'}),
      ).toBeNull()
    })

    result.unmount()
  })
})
