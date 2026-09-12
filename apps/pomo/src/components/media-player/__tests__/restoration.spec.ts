/** @vitest-environment jsdom */
import {describe, expect, it, vi} from 'vitest'

import type {PPlaybackState, PTrack} from '../../../features/focus-room-audio'
import {restorePPlayerState} from '../restoration'

const DEFAULT_TRACK = {
  artist: 'Artist',
  durationSeconds: 1,
  id: 'default',
  source: '/default.mp3',
  title: 'Default',
} as const satisfies PTrack
const ALBUM_TRACK = {
  artist: 'Artist',
  durationSeconds: 1,
  id: 'album',
  source: '/album.mp3',
  title: 'Album',
} as const satisfies PTrack
const ALBUM_PLAYBACK = {
  isPlaying: false,
  positionSeconds: 10,
  trackId: ALBUM_TRACK.id,
} as const satisfies PPlaybackState

describe('restorePPlayerState', () => {
  it.each([{defaultTracks: [DEFAULT_TRACK]}, {defaultTracks: [DEFAULT_TRACK, ALBUM_TRACK]}])(
    'should wait for the stored playlist before applying playback with default queue %j',
    async ({defaultTracks}) => {
      let resolvePlaylist!: (trackIds: readonly string[]) => void
      const playlistRequest = new Promise<readonly string[]>((resolve) => {
        resolvePlaylist = resolve
      })
      const onRestore = vi.fn()
      const restoration = restorePPlayerState({
        canRestore: () => true,
        defaultTracks,
        onRestore,
        playbackRequest: Promise.resolve(ALBUM_PLAYBACK),
        playlistRequest,
        tracks: [DEFAULT_TRACK, ALBUM_TRACK],
      })

      await Promise.resolve()

      expect(onRestore).not.toHaveBeenCalled()

      resolvePlaylist([ALBUM_TRACK.id])
      await restoration

      expect(onRestore).toHaveBeenCalledExactlyOnceWith([ALBUM_TRACK], ALBUM_PLAYBACK)
    },
  )
  it.each([
    {expectedTracks: [DEFAULT_TRACK, ALBUM_TRACK], storedTrackIds: null},
    {expectedTracks: [], storedTrackIds: []},
  ])(
    'should apply playback once after resolving playlist $storedTrackIds',
    async ({storedTrackIds, expectedTracks}) => {
      const playlist = Promise.withResolvers<readonly string[] | null>()
      const onRestore = vi.fn()
      const restoration = restorePPlayerState({
        canRestore: () => true,
        defaultTracks: [DEFAULT_TRACK, ALBUM_TRACK],
        onRestore,
        playbackRequest: Promise.resolve(ALBUM_PLAYBACK),
        playlistRequest: playlist.promise,
        tracks: [DEFAULT_TRACK, ALBUM_TRACK],
      })
      await Promise.resolve()
      expect(onRestore).not.toHaveBeenCalled()
      playlist.resolve(storedTrackIds)
      await restoration
      expect(onRestore).toHaveBeenCalledExactlyOnceWith(expectedTracks, ALBUM_PLAYBACK)
    },
  )

  it('should restore the playlist before delayed playback using the resolved queue', async () => {
    const playback = Promise.withResolvers<PPlaybackState | null>()
    const onRestore = vi.fn()
    const restoration = restorePPlayerState({
      canRestore: () => true,
      defaultTracks: [DEFAULT_TRACK, ALBUM_TRACK],
      onRestore,
      playbackRequest: playback.promise,
      playlistRequest: Promise.resolve([ALBUM_TRACK.id]),
      tracks: [DEFAULT_TRACK, ALBUM_TRACK],
    })
    await Promise.resolve()
    expect(onRestore).toHaveBeenCalledExactlyOnceWith([ALBUM_TRACK], null)
    playback.resolve(ALBUM_PLAYBACK)
    await restoration
    expect(onRestore.mock.calls).toEqual([
      [[ALBUM_TRACK], null],
      [[ALBUM_TRACK], ALBUM_PLAYBACK],
    ])
  })

  it('should discard playback invalidated while waiting for the playlist', async () => {
    const playlist = Promise.withResolvers<readonly string[] | null>()
    let canRestore = true
    const onRestore = vi.fn()
    const restoration = restorePPlayerState({
      canRestore: () => canRestore,
      defaultTracks: [DEFAULT_TRACK, ALBUM_TRACK],
      onRestore,
      playbackRequest: Promise.resolve(ALBUM_PLAYBACK),
      playlistRequest: playlist.promise,
      tracks: [DEFAULT_TRACK, ALBUM_TRACK],
    })
    await Promise.resolve()
    canRestore = false
    playlist.resolve([ALBUM_TRACK.id])
    await restoration
    expect(onRestore).not.toHaveBeenCalled()
  })
})
