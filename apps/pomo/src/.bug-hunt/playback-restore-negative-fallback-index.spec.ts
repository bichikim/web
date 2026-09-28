/** @vitest-environment node */
import {expect, it} from 'vitest'

import {resolvePlaybackRestore} from '../features/focus-room-audio/playback-restore'

const TRACKS = [
  {artist: 'Artist', durationSeconds: 10, id: 'one', source: '/one.mp3', title: 'One'},
  {artist: 'Artist', durationSeconds: 10, id: 'two', source: '/two.mp3', title: 'Two'},
] as const

it('should normalize a negative wrapped fallback index to a valid track index', () => {
  expect(resolvePlaybackRestore({fallbackIndex: -3, storedPlayback: null, tracks: TRACKS})).toEqual(
    {
      currentIndex: 1,
      playback: null,
      shouldPersist: false,
    },
  )
})
