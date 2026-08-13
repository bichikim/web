import {afterEach, describe, expect, it, vi} from 'vitest'

import {createShuffleQueue} from '../shuffle-queue'

describe('createShuffleQueue', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should shuffle every track when no current track exists', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)

    expect(createShuffleQueue({trackCount: 3})).toEqual([1, 2, 0])
  })

  it('should exclude the current track from the remaining queue', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)

    expect(createShuffleQueue({currentIndex: 1, trackCount: 3})).toEqual([2, 0])
  })
})
