import {afterEach, describe, expect, it, vi} from 'vitest'

import {createInitialPlaybackState} from '../initial-playback-state'

describe('createInitialPlaybackState', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should select the first track from the shuffled playlist', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)

    expect(createInitialPlaybackState({trackCount: 3})).toEqual({
      currentIndex: 1,
      queue: [2, 0],
    })
  })

  it('should provide an empty state when the playlist has no tracks', () => {
    expect(createInitialPlaybackState({trackCount: 0})).toEqual({
      currentIndex: 0,
      queue: [],
    })
  })
})
