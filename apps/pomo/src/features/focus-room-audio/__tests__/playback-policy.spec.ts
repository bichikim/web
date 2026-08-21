import {describe, expect, it} from 'vitest'

import {resolveTrackEnd, resolveTrackRemoval} from '../playback-policy'

describe('resolveTrackRemoval', () => {
  it('should preserve the current track when removing a later track', () => {
    expect(resolveTrackRemoval({currentIndex: 1, removeIndex: 3, trackCount: 5})).toEqual({
      currentTrackChanged: false,
      nextCurrentIndex: 1,
    })
  })

  it('should shift the current index when removing an earlier track', () => {
    expect(resolveTrackRemoval({currentIndex: 3, removeIndex: 1, trackCount: 5})).toEqual({
      currentTrackChanged: false,
      nextCurrentIndex: 2,
    })
  })

  it('should select the following track when removing the current track', () => {
    expect(resolveTrackRemoval({currentIndex: 1, removeIndex: 1, trackCount: 3})).toEqual({
      currentTrackChanged: true,
      nextCurrentIndex: 1,
    })
  })

  it('should select the previous track when removing the final current track', () => {
    expect(resolveTrackRemoval({currentIndex: 2, removeIndex: 2, trackCount: 3})).toEqual({
      currentTrackChanged: true,
      nextCurrentIndex: 1,
    })
  })

  it('should clear the current track when removing the only track', () => {
    expect(resolveTrackRemoval({currentIndex: 0, removeIndex: 0, trackCount: 1})).toEqual({
      currentTrackChanged: true,
      nextCurrentIndex: 0,
    })
  })
})

describe('resolveTrackEnd', () => {
  it('should restart the current track only in one-track repeat mode', () => {
    expect(
      resolveTrackEnd({
        currentIndex: 2,
        repeatMode: 'repeat-one',
        shuffleEnabled: true,
        shuffleRemaining: 3,
        trackCount: 5,
      }),
    ).toBe('restart-current')
  })

  it('should play the next sequential track when the playlist has more tracks', () => {
    expect(
      resolveTrackEnd({
        currentIndex: 2,
        repeatMode: 'none',
        shuffleEnabled: false,
        shuffleRemaining: 0,
        trackCount: 5,
      }),
    ).toBe('play-next')
  })

  it('should restart the sequential playlist only when repeat all is enabled', () => {
    const commonOptions = {
      currentIndex: 4,
      shuffleEnabled: false,
      shuffleRemaining: 0,
      trackCount: 5,
    } as const

    expect(resolveTrackEnd({...commonOptions, repeatMode: 'repeat-all'})).toBe('play-first')
    expect(resolveTrackEnd({...commonOptions, repeatMode: 'none'})).toBe('stop')
  })

  it('should consume every remaining shuffled track before stopping', () => {
    const commonOptions = {
      currentIndex: 2,
      repeatMode: 'none',
      shuffleEnabled: true,
      trackCount: 5,
    } as const

    expect(resolveTrackEnd({...commonOptions, shuffleRemaining: 2})).toBe('play-shuffled')
    expect(resolveTrackEnd({...commonOptions, shuffleRemaining: 0})).toBe('stop')
  })

  it('should create a new shuffle cycle after every track played in repeat all mode', () => {
    expect(
      resolveTrackEnd({
        currentIndex: 2,
        repeatMode: 'repeat-all',
        shuffleEnabled: true,
        shuffleRemaining: 0,
        trackCount: 5,
      }),
    ).toBe('restart-shuffle')
  })
})
