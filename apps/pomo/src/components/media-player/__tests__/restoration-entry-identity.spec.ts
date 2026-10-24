/** @vitest-environment jsdom */

import {expect, it, vi} from 'vitest'

import type {PPlaybackState, PTrack} from '../../../features/focus-room-audio'
import {restorePPlayerState} from '../restoration'

const TRACK = {
  artist: 'Artist',
  durationSeconds: 10,
  id: 'one',
  source: '/one.mp3',
  title: 'One',
} satisfies PTrack
const DEFAULT_TRACK = {...TRACK, id: 'default'} satisfies PTrack
const PLAYBACK = {
  isPlaying: false,
  positionSeconds: 17,
  queueEntryId: 'second-one',
  trackId: TRACK.id,
  trackIndex: 2,
} satisfies PPlaybackState

it('should keep stored entry IDs aligned when unavailable tracks are skipped', async () => {
  const onRestore = vi.fn()
  const resolveTracks = vi.fn(async () => [TRACK])

  await restorePPlayerState({
    canRestore: () => true,
    defaultTracks: [DEFAULT_TRACK],
    onRestore,
    playbackRequest: Promise.resolve(PLAYBACK),
    playlistRequest: Promise.resolve({
      entryIds: ['first-one', 'removed-one', 'second-one'],
      trackIds: ['one', 'removed', 'one'],
    }),
    resolveTracks,
    tracks: [TRACK],
  })

  expect(resolveTracks).toHaveBeenCalledExactlyOnceWith(['one', 'removed', 'one'])
  expect(onRestore).toHaveBeenCalledExactlyOnceWith([TRACK, TRACK], PLAYBACK, [
    'first-one',
    'second-one',
  ])
})
