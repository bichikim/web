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

  it('should use the artists list when the primary artist tag is empty', async () => {
    const metadata = await readTrackMetadata(new File(['mp3'], 'track.mp3'), {
      parseMetadata: vi.fn().mockResolvedValue({
        common: {artist: '', artists: ['Pomo', 'Friend'], title: 'Focus Song'},
      }),
    })

    expect(metadata).toEqual({artist: 'Pomo, Friend', title: 'Focus Song'})
  })

  it('should omit leading blank artists when joining the fallback list', async () => {
    const metadata = await readTrackMetadata(new File(['mp3'], 'track.mp3'), {
      parseMetadata: vi.fn().mockResolvedValue({
        common: {artists: ['', 'Pomo'], title: 'Song'},
      }),
    })

    expect(metadata).toEqual({artist: 'Pomo', title: 'Song'})
  })

  it('should omit trailing blank artists when joining the fallback list', async () => {
    const metadata = await readTrackMetadata(new File(['mp3'], 'track.mp3'), {
      parseMetadata: vi.fn().mockResolvedValue({
        common: {artists: ['Pomo', ''], title: 'Song'},
      }),
    })

    expect(metadata).toEqual({artist: 'Pomo', title: 'Song'})
  })

  it('should omit whitespace-only artists when joining the fallback list', async () => {
    const metadata = await readTrackMetadata(new File(['mp3'], 'track.mp3'), {
      parseMetadata: vi.fn().mockResolvedValue({
        common: {artists: ['  ', 'Pomo', '\t', 'Friend', '  '], title: 'Song'},
      }),
    })

    expect(metadata).toEqual({artist: 'Pomo, Friend', title: 'Song'})
  })

  it('should return a null fallback artist when every artist entry is blank', async () => {
    const metadata = await readTrackMetadata(new File(['mp3'], 'track.mp3'), {
      parseMetadata: vi.fn().mockResolvedValue({
        common: {artists: ['', '  '], title: 'Song'},
      }),
    })

    expect(metadata).toEqual({artist: null, title: 'Song'})
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
