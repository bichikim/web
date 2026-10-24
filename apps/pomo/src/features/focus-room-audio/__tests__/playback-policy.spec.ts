/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {
  normalizeTrackIndex,
  resolveManualNavigation,
  resolveTrackEnd,
  resolveTrackRemoval,
} from '../playback-policy'

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

describe('resolveManualNavigation', () => {
  it('should resolve an available sequential destination', () => {
    expect(
      resolveManualNavigation({
        currentIndex: 1,
        direction: 'next',
        repeatMode: 'none',
        shuffleEnabled: false,
        shuffleHistory: [],
        shuffleQueue: [],
        trackCount: 3,
      }),
    ).toEqual({index: 2, shuffleHistory: [], shuffleQueue: [], type: 'select'})
  })

  it.each([
    {currentIndex: 2, direction: 'next'},
    {currentIndex: 0, direction: 'previous'},
  ] as const)('should reject repeat-disabled $direction at a playlist boundary', (options) => {
    expect(
      resolveManualNavigation({
        ...options,
        repeatMode: 'none',
        shuffleEnabled: false,
        shuffleHistory: [],
        shuffleQueue: [],
        trackCount: 3,
      }),
    ).toEqual({type: 'none'})
  })

  it('should consume the next shuffled destination and append history', () => {
    expect(
      resolveManualNavigation({
        currentIndex: 0,
        direction: 'next',
        repeatMode: 'none',
        shuffleEnabled: true,
        shuffleHistory: [],
        shuffleQueue: [2, 1],
        trackCount: 3,
      }),
    ).toEqual({index: 2, shuffleHistory: [0], shuffleQueue: [1], type: 'select'})
  })

  it('should stop repeat-disabled shuffled navigation after the queue is consumed', () => {
    expect(
      resolveManualNavigation({
        currentIndex: 2,
        direction: 'next',
        repeatMode: 'none',
        shuffleEnabled: true,
        shuffleHistory: [0, 1],
        shuffleQueue: [],
        trackCount: 3,
      }),
    ).toEqual({type: 'none'})
  })

  it('should request a new shuffled queue for repeat-enabled navigation', () => {
    expect(
      resolveManualNavigation({
        currentIndex: 2,
        direction: 'next',
        repeatMode: 'repeat-all',
        shuffleEnabled: true,
        shuffleHistory: [0, 1],
        shuffleQueue: [],
        trackCount: 3,
      }),
    ).toEqual({type: 'reset-shuffle-queue'})
  })

  it('should resolve the previous shuffled history entry and reconcile state', () => {
    expect(
      resolveManualNavigation({
        currentIndex: 0,
        direction: 'previous',
        repeatMode: 'none',
        shuffleEnabled: true,
        shuffleHistory: [2, 1],
        shuffleQueue: [2],
        trackCount: 3,
      }),
    ).toEqual({index: 1, shuffleHistory: [2], shuffleQueue: [0, 2], type: 'select'})
  })

  it('should request a refreshed queue after sequential previous navigation in shuffle mode', () => {
    expect(
      resolveManualNavigation({
        currentIndex: 1,
        direction: 'previous',
        repeatMode: 'none',
        shuffleEnabled: true,
        shuffleHistory: [],
        shuffleQueue: [0, 2],
        trackCount: 3,
      }),
    ).toEqual({index: 0, shuffleHistory: [], shuffleQueue: 'reset', type: 'select'})
  })

  it('should restart a single track only for repeat-enabled next navigation', () => {
    expect(
      resolveManualNavigation({
        currentIndex: 0,
        direction: 'next',
        repeatMode: 'repeat-all',
        shuffleEnabled: false,
        shuffleHistory: [],
        shuffleQueue: [],
        trackCount: 1,
      }),
    ).toEqual({type: 'restart'})
    expect(
      resolveManualNavigation({
        currentIndex: 0,
        direction: 'next',
        repeatMode: 'none',
        shuffleEnabled: false,
        shuffleHistory: [],
        shuffleQueue: [],
        trackCount: 1,
      }),
    ).toEqual({type: 'none'})
  })
})

describe('normalizeTrackIndex', () => {
  it.each([
    {expected: 0, index: 0, trackCount: 3},
    {expected: 0, index: 3, trackCount: 3},
    {expected: 2, index: -1, trackCount: 3},
    {expected: undefined, index: 1.5, trackCount: 3},
    {expected: undefined, index: 0, trackCount: 0},
  ] as const)('should normalize $index with $trackCount tracks to $expected', (options) => {
    expect(normalizeTrackIndex(options.index, options.trackCount)).toBe(options.expected)
  })
})

describe('resolveTrackEnd', () => {
  it.each([
    {expected: 'stop', repeatMode: 'none', trackCount: 0},
    {expected: 'stop', repeatMode: 'none', trackCount: 1},
    {expected: 'restart-current', repeatMode: 'repeat-all', trackCount: 0},
    {expected: 'restart-current', repeatMode: 'repeat-all', trackCount: 1},
  ] as const)(
    'should resolve $repeatMode with $trackCount available tracks as $expected',
    ({expected, repeatMode, trackCount}) => {
      expect(
        resolveTrackEnd({
          currentIndex: 0,
          repeatMode,
          shuffleEnabled: true,
          shuffleRemaining: 2,
          trackCount,
        }),
      ).toBe(expected)
    },
  )

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
