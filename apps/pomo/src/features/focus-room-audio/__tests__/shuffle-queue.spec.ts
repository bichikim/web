/** @vitest-environment node */
import {describe, expect, it, vi} from 'vitest'

import {createShuffleQueue} from '../shuffle-queue'

describe('createShuffleQueue', () => {
  it('should shuffle every track when no current track exists', () => {
    const shuffle = vi.fn((tracks: number[]) => tracks.toReversed())

    expect(createShuffleQueue({shuffle, trackCount: 3})).toEqual([2, 1, 0])
    expect(shuffle).toHaveBeenCalledExactlyOnceWith([0, 1, 2])
  })

  it('should exclude the current track from the remaining queue', () => {
    const shuffle = vi.fn((tracks: number[]) => tracks.toReversed())

    expect(createShuffleQueue({currentIndex: 1, shuffle, trackCount: 3})).toEqual([2, 0])
    expect(shuffle).toHaveBeenCalledExactlyOnceWith([0, 2])
  })

  it('should preserve all eligible tracks with the default shuffle', () => {
    const queue = createShuffleQueue({currentIndex: 1, trackCount: 4})
    expect(queue.toSorted()).toEqual([0, 2, 3])
  })

  it('should return an empty queue when no eligible tracks remain', () => {
    expect(createShuffleQueue({trackCount: 0})).toEqual([])
    expect(createShuffleQueue({currentIndex: 0, trackCount: 1})).toEqual([])
  })
})
