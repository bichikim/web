/** @vitest-environment node */
import {describe, expect, it, vi} from 'vitest'

import {readTrackMetadata} from '../features/admin-music/track-metadata'

describe('readTrackMetadata artists[] blank entries', () => {
  it('should omit blank artists list entries when joining the fallback artist tag', async () => {
    const metadata = await readTrackMetadata(new File(['mp3'], 'track.mp3'), {
      parseMetadata: vi.fn().mockResolvedValue({
        common: {artists: ['', 'Pomo'], title: 'Song'},
      }),
    })

    expect(metadata).toEqual({artist: 'Pomo', title: 'Song'})
  })

  it('should not leave a trailing comma when the last artists entry is blank', async () => {
    const metadata = await readTrackMetadata(new File(['mp3'], 'track.mp3'), {
      parseMetadata: vi.fn().mockResolvedValue({
        common: {artists: ['Pomo', ''], title: 'Song'},
      }),
    })

    expect(metadata).toEqual({artist: 'Pomo', title: 'Song'})
  })
})
