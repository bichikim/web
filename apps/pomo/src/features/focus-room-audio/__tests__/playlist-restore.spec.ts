/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {CUSTOM_TRACK_ID_PREFIX} from '../../custom-albums/model'
import type {PTrack} from '../focus-room-playlist'
import {resolvePPlaylist} from '../playlist-restore'

const TRACKS = [
  {artist: 'Artist', durationSeconds: 1, id: 'one', source: '/one.mp3', title: 'One'},
  {artist: 'Artist', durationSeconds: 1, id: 'two', source: '/two.mp3', title: 'Two'},
  {artist: 'Artist', durationSeconds: 1, id: 'three', source: '/three.mp3', title: 'Three'},
] as const satisfies readonly PTrack[]

const DEFAULT_TRACKS = [TRACKS[0], TRACKS[1]]
const MISSING_CUSTOM_TRACK_ID = `${CUSTOM_TRACK_ID_PREFIX}missing`

describe('resolvePPlaylist', () => {
  it('should use the default playlist when no user playlist was saved', () => {
    expect(
      resolvePPlaylist({defaultTracks: DEFAULT_TRACKS, storedTrackIds: null, tracks: TRACKS}),
    ).toBe(DEFAULT_TRACKS)
  })

  it('should restore saved tracks in order and skip tracks removed from the catalog', () => {
    expect(
      resolvePPlaylist({
        defaultTracks: DEFAULT_TRACKS,
        storedTrackIds: ['three', 'removed', MISSING_CUSTOM_TRACK_ID, 'one'],
        tracks: TRACKS,
      }),
    ).toEqual([TRACKS[2], TRACKS[0]])
  })

  it('should preserve an explicitly emptied playlist', () => {
    expect(
      resolvePPlaylist({defaultTracks: DEFAULT_TRACKS, storedTrackIds: [], tracks: TRACKS}),
    ).toEqual([])
  })

  it('should use the default playlist when only obsolete bundled tracks remain', () => {
    expect(
      resolvePPlaylist({
        defaultTracks: DEFAULT_TRACKS,
        storedTrackIds: ['obsolete-bundled-track'],
        tracks: TRACKS,
      }),
    ).toBe(DEFAULT_TRACKS)
  })

  it.each([
    {label: 'custom-only', storedTrackIds: [MISSING_CUSTOM_TRACK_ID]},
    {label: 'mixed missing', storedTrackIds: [MISSING_CUSTOM_TRACK_ID, 'obsolete-bundled-track']},
  ])('should preserve an unresolved custom selection ($label)', ({storedTrackIds}) => {
    expect(
      resolvePPlaylist({defaultTracks: DEFAULT_TRACKS, storedTrackIds, tracks: TRACKS}),
    ).toEqual([])
  })
})
