/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import type {PTrack} from '../features/focus-room-audio/focus-room-playlist'
import {resolvePlaybackRestore} from '../features/focus-room-audio/playback-restore'

const one = {
  artist: 'Artist',
  durationSeconds: 10,
  id: 'one',
  source: '/one.mp3',
  title: 'One',
} satisfies PTrack

const two = {
  artist: 'Artist',
  durationSeconds: 10,
  id: 'two',
  source: '/two.mp3',
  title: 'Two',
} satisfies PTrack

describe('resolvePlaybackRestore duplicate track ids', () => {
  it('should restore the closest matching occurrence when a saved trackIndex no longer points at the track id', () => {
    const storedPlayback = {
      isPlaying: false,
      positionSeconds: 42,
      trackId: 'one',
      trackIndex: 2,
    }

    expect(
      resolvePlaybackRestore({
        fallbackIndex: 0,
        storedPlayback,
        tracks: [one, two, two, one],
      }),
    ).toMatchObject({
      currentIndex: 3,
      playback: storedPlayback,
      shouldPersist: false,
    })
  })
})
