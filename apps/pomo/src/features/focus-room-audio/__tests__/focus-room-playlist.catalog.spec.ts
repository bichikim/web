/** @vitest-environment node */

import {afterEach, describe, expect, it, vi} from 'vitest'

import {loadPTrackCatalog} from '../focus-room-playlist'

const TRACKS = [
  {artist: 'Artist', durationSeconds: 1, id: 'one', source: '/one.mp3', title: 'One'},
  {artist: 'Artist', durationSeconds: 2, id: 'two', source: '/two.mp3', title: 'Two'},
] as const

const createJsonResponse = (value: unknown) => ({
  json: () => Promise.resolve(value),
  ok: true,
  status: 200,
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('loadPTrackCatalog', () => {
  it('should load and validate the complete track catalog', async () => {
    const fetchMock = vi.fn().mockResolvedValue(createJsonResponse({tracks: TRACKS, version: 1}))
    vi.stubGlobal('fetch', fetchMock)

    await expect(loadPTrackCatalog()).resolves.toEqual(TRACKS)
    expect(fetchMock).toHaveBeenCalledWith(
      '/audio/tracks.json',
      expect.objectContaining({cache: 'no-store', signal: undefined}),
    )
  })

  it('should preserve override URL, signal, and production cache policy', async () => {
    const signal = new AbortController().signal
    const fetchMock = vi.fn().mockResolvedValue(createJsonResponse({tracks: [], version: 1}))
    vi.stubEnv('DEV', false)
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      loadPTrackCatalog({signal, tracksUrl: 'https://pomo.test/tracks.json'}),
    ).resolves.toEqual([])
    expect(fetchMock).toHaveBeenCalledWith(
      'https://pomo.test/tracks.json',
      expect.objectContaining({cache: 'default', signal}),
    )
  })

  it.each([null, {tracks: [TRACKS[0], TRACKS[0]], version: 1}, {tracks: [null], version: 1}])(
    'should reject an invalid track collection',
    (collection) => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(createJsonResponse(collection)))

      return expect(loadPTrackCatalog()).rejects.toThrow('Focus-room tracks have an invalid format')
    },
  )

  it('should preserve a failed track request status', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({json: () => Promise.resolve(null), ok: false, status: 503}),
    )

    return expect(loadPTrackCatalog()).rejects.toThrow('Focus-room tracks request failed: 503')
  })
})
