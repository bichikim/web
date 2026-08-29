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
  it('waits for a stored playlist when its current track is absent from the default queue', async () => {
    let resolvePlaylist!: (trackIds: readonly string[]) => void
    const playlistRequest = new Promise<readonly string[]>((resolve) => {
      resolvePlaylist = resolve
    })
    const onRestore = vi.fn()
    const restoration = restorePPlayerState({
      canRestore: () => true,
      defaultTracks: [DEFAULT_TRACK],
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
  })
})
