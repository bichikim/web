/** @vitest-environment node */
import {describe, expect, it, vi} from 'vitest'

import {restorePPlayerState} from '../components/media-player/restoration'

vi.mock('../features/focus-room-audio', () => ({
  resolvePPlaylist: ({
    defaultTracks,
    storedTrackIds,
    tracks,
  }: {
    defaultTracks: readonly {id: string}[]
    storedTrackIds: readonly string[] | null
    tracks: readonly {id: string}[]
  }) => {
    if (storedTrackIds === null) {
      return defaultTracks
    }

    return storedTrackIds.flatMap((trackId) => {
      const track = tracks.find((candidate) => candidate.id === trackId)
      return track === undefined ? [] : [track]
    })
  },
}))

const DEFAULT_TRACK = {id: 'default'} as const
const ALBUM_TRACK = {id: 'album'} as const
const SAVED_PLAYBACK = {
  isPlaying: false,
  positionSeconds: 12,
  trackId: ALBUM_TRACK.id,
} as const

describe('restorePPlayerState', () => {
  it('should wait for saved playback before restoring a persisted playlist', async () => {
    const playback = Promise.withResolvers<typeof SAVED_PLAYBACK | null>()
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

    expect(onRestore).not.toHaveBeenCalled()

    playback.resolve(SAVED_PLAYBACK)
    await restoration

    expect(onRestore).toHaveBeenCalledExactlyOnceWith([ALBUM_TRACK], SAVED_PLAYBACK)
  })
})
