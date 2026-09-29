/** @vitest-environment jsdom */

import {afterEach, expect, it, vi} from 'vitest'

import {revokeCustomTrackObjectUrls, toCustomPTrack} from '../index'

afterEach(() => {
  revokeCustomTrackObjectUrls(new Set(['custom-track-1']))
  vi.unstubAllGlobals()
})

it('should release cached audio URLs when custom tracks are removed from storage', () => {
  const createObjectURL = vi
    .fn<(object: Blob | MediaSource) => string>()
    .mockReturnValueOnce('blob:custom-track-1')
    .mockReturnValueOnce('blob:custom-track-2')
  const revokeObjectURL = vi.fn<(url: string) => void>()
  vi.stubGlobal('URL', {createObjectURL, revokeObjectURL})
  const track = {
    albumId: 'custom-album-1',
    artist: '',
    audio: new Blob(['audio'], {type: 'audio/mpeg'}),
    durationSeconds: 1,
    fileName: 'track.mp3',
    id: 'custom-track-1',
    title: 'Track',
  } satisfies Parameters<typeof toCustomPTrack>[0]

  const firstTrack = toCustomPTrack(track)
  expect(toCustomPTrack(track).source).toBe(firstTrack.source)

  revokeCustomTrackObjectUrls(new Set([track.id]))

  expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith(firstTrack.source)
  expect(toCustomPTrack(track).source).toBe('blob:custom-track-2')
})
