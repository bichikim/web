import {describe, expect, it} from 'vitest'

import {resolvePlaybackRestore} from '../playback-restore'

const TRACKS = [
  {artist: 'Artist', durationSeconds: 10, id: 'one', source: '/one.mp3', title: 'One'},
  {artist: 'Artist', durationSeconds: 10, id: 'two', source: '/two.mp3', title: 'Two'},
] as const

describe('resolvePlaybackRestore', () => {
  it('should preserve the fallback selection without stored playback', () => {
    expect(
      resolvePlaybackRestore({fallbackIndex: 1, storedPlayback: null, tracks: TRACKS}),
    ).toEqual({currentIndex: 1, playback: null, shouldPersist: false})
  })

  it('should restore a track that remains in the playlist', () => {
    const storedPlayback = {isPlaying: true, positionSeconds: 8, trackId: 'two'}

    expect(resolvePlaybackRestore({fallbackIndex: 0, storedPlayback, tracks: TRACKS})).toEqual({
      currentIndex: 1,
      playback: storedPlayback,
      shouldPersist: false,
    })
  })

  it('should reset missing playback to the first track', () => {
    expect(
      resolvePlaybackRestore({
        fallbackIndex: 1,
        storedPlayback: {isPlaying: true, positionSeconds: 8, trackId: 'removed'},
        tracks: TRACKS,
      }),
    ).toEqual({
      currentIndex: 0,
      playback: {isPlaying: false, positionSeconds: 0, trackId: 'one'},
      shouldPersist: true,
    })
  })
})
