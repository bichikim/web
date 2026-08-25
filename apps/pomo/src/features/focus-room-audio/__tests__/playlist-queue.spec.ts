import {describe, expect, it} from 'vitest'

import type {PTrack} from '../focus-room-playlist'
import {appendUniqueTracks} from '../playlist-queue'

const createTrack = (id: string): PTrack => ({
  artist: `Artist ${id}`,
  durationSeconds: 60,
  id,
  source: `/${id}.mp3`,
  title: `Track ${id}`,
})

describe('appendUniqueTracks', () => {
  it('should append new tracks in their first-seen order', () => {
    const first = createTrack('first')
    const second = createTrack('second')
    const third = createTrack('third')

    expect(appendUniqueTracks([first], [second, third])).toEqual([first, second, third])
  })

  it('should exclude tracks already queued and duplicates within the addition', () => {
    const first = createTrack('first')
    const duplicateFirst = createTrack('first')
    const second = createTrack('second')
    const duplicateSecond = createTrack('second')

    expect(appendUniqueTracks([first], [duplicateFirst, second, duplicateSecond])).toEqual([
      first,
      second,
    ])
  })

  it('should preserve the original queue reference when no track is added', () => {
    const tracks = [createTrack('first')]

    expect(appendUniqueTracks(tracks, [])).toBe(tracks)
    expect(appendUniqueTracks(tracks, [createTrack('first')])).toBe(tracks)
  })

  it('should build a unique queue from an empty current list', () => {
    const first = createTrack('first')
    const second = createTrack('second')

    expect(appendUniqueTracks([], [first, first, second])).toEqual([first, second])
  })
})
