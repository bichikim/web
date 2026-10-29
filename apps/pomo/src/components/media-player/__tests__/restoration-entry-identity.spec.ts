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

it('should retain occurrence IDs across interleaved duplicate tracks', async () => {
  const second = {...TRACK, id: 'two'}
  const onRestore = vi.fn()
  await restorePPlayerState({
    canRestore: () => true,
    defaultTracks: [],
    onRestore,
    playbackRequest: Promise.resolve(PLAYBACK),
    playlistRequest: Promise.resolve({
      entryIds: ['first-one', 'first-two', 'second-one', 'removed'],
      trackIds: ['one', 'two', 'one', 'missing'],
    }),
    tracks: [TRACK, second],
  })
  expect(onRestore).toHaveBeenCalledExactlyOnceWith([TRACK, second, TRACK], PLAYBACK, [
    'first-one',
    'first-two',
    'second-one',
  ])
})

it.each([{entryIds: ['short']}, {entryIds: ['duplicate', 'duplicate']}])(
  'should omit all occurrence IDs when the stored IDs are invalid ($entryIds)',
  async ({entryIds}) => {
    const onRestore = vi.fn()
    await restorePPlayerState({
      canRestore: () => true,
      defaultTracks: [],
      onRestore,
      playbackRequest: Promise.resolve(PLAYBACK),
      playlistRequest: Promise.resolve({entryIds, trackIds: ['one', 'one']}),
      tracks: [TRACK],
    })
    expect(onRestore).toHaveBeenCalledExactlyOnceWith([TRACK, TRACK], PLAYBACK)
  },
)

it('should omit all IDs when the fallback tracks have no matching occurrence', async () => {
  const onRestore = vi.fn()
  await restorePPlayerState({
    canRestore: () => true,
    defaultTracks: [DEFAULT_TRACK],
    onRestore,
    playbackRequest: Promise.resolve(PLAYBACK),
    playlistRequest: Promise.resolve({entryIds: ['stored'], trackIds: ['missing']}),
    tracks: [TRACK],
  })
  expect(onRestore).toHaveBeenCalledExactlyOnceWith([DEFAULT_TRACK], PLAYBACK)
})
