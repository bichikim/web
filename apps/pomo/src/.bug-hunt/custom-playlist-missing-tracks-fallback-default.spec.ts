/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import type {PTrack} from '../features/focus-room-audio/focus-room-playlist'
import {resolvePPlaylist} from '../features/focus-room-audio/playlist-restore'

const DEFAULT_TRACKS = [
  {
    artist: 'Default',
    durationSeconds: 60,
    id: 'default-a',
    source: '/default-a.mp3',
    title: 'Default A',
  },
] as const satisfies readonly PTrack[]

const BUNDLED_TRACKS = [
  ...DEFAULT_TRACKS,
  {
    artist: 'Bundled',
    durationSeconds: 60,
    id: 'bundled-b',
    source: '/bundled-b.mp3',
    title: 'Bundled B',
  },
] as const satisfies readonly PTrack[]

const CUSTOM_TRACK_ID = 'custom-track:album-1:track-1'

describe('custom-only saved playlist when custom tracks are missing from the catalog', () => {
  it('should keep an empty restored playlist instead of substituting the default', () => {
    expect(
      resolvePPlaylist({
        defaultTracks: DEFAULT_TRACKS,
        storedTrackIds: [CUSTOM_TRACK_ID],
        tracks: BUNDLED_TRACKS,
      }),
    ).toEqual([])
  })

  it('should not return the default playlist reference when every saved id is unresolved', () => {
    const restored = resolvePPlaylist({
      defaultTracks: DEFAULT_TRACKS,
      storedTrackIds: [CUSTOM_TRACK_ID],
      tracks: BUNDLED_TRACKS,
    })

    expect(restored).not.toBe(DEFAULT_TRACKS)
  })
})
