/** @vitest-environment jsdom */

import {describe, expect, it, vi} from 'vitest'

import {readTrackMetadata} from '../track-metadata'

describe('readTrackMetadata', () => {
  it('should normalize an MP3 title and artist', async () => {
    const parseMetadata = vi.fn().mockResolvedValue({
      common: {artist: '  Pomo  ', title: '  Focus Song  '},
    })

    const metadata = await readTrackMetadata(new File(['mp3'], 'track.mp3'), {parseMetadata})

    expect(metadata).toEqual({artist: 'Pomo', title: 'Focus Song'})
  })

  it('should use the artists list when the primary artist tag is absent', async () => {
    const metadata = await readTrackMetadata(new File(['mp3'], 'track.mp3'), {
      parseMetadata: vi.fn().mockResolvedValue({
        common: {artists: ['Pomo', 'Friend'], title: undefined},
      }),
    })

    expect(metadata).toEqual({artist: 'Pomo, Friend', title: null})
  })
})
