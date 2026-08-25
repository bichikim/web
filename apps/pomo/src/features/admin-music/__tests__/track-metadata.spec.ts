/** @vitest-environment jsdom */

import {describe, expect, it, vi} from 'vitest'

const metadataMocks = vi.hoisted(() => ({parseBlob: vi.fn()}))

vi.mock('music-metadata', () => metadataMocks)

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

  it('should lazily parse a file with default metadata options', async () => {
    metadataMocks.parseBlob.mockResolvedValue({common: {artist: ' ', title: 'Song'}})
    const file = new File(['mp3'], 'track.mp3')

    const metadata = await readTrackMetadata(file)

    expect(metadata).toEqual({artist: null, title: 'Song'})
    expect(metadataMocks.parseBlob).toHaveBeenCalledWith(file, {
      duration: false,
      skipCovers: true,
    })
  })

  it('should return empty metadata when no artist tags exist', async () => {
    const metadata = await readTrackMetadata(new File(['mp3'], 'track.mp3'), {
      parseMetadata: vi.fn().mockResolvedValue({common: {}}),
    })

    expect(metadata).toEqual({artist: null, title: null})
  })
})
