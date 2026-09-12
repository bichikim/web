/** @vitest-environment node */
import {afterEach, describe, expect, it, vi} from 'vitest'

import {loadPTrackQueueSource, loadPTracks} from '../focus-room-playlist'

const TRACKS = [
  {artist: 'Artist', durationSeconds: 1, id: 'one', source: '/one.mp3', title: 'One'},
  {artist: 'Artist', durationSeconds: 2, id: 'two', source: '/two.mp3', title: 'Two'},
] as const

const createJsonResponse = (value: unknown) => ({
  json: () => Promise.resolve(value),
  ok: true,
  status: 200,
})

const createErrorResponse = (status: number) => ({
  json: () => Promise.resolve(null),
  ok: false,
  status,
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('loadPTracks', () => {
  it('should resolve playlist IDs against the track catalog in playlist order', () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createJsonResponse({tracks: TRACKS, version: 1}))
      .mockResolvedValueOnce(createJsonResponse({trackIds: ['two', 'one'], version: 1}))
    vi.stubGlobal('fetch', fetchMock)

    const result = loadPTracks()

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/audio/tracks.json',
      expect.objectContaining({cache: 'no-store', signal: undefined}),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/audio/playlist.json',
      expect.objectContaining({cache: 'no-store', signal: undefined}),
    )
    return expect(result).resolves.toEqual([TRACKS[1], TRACKS[0]])
  })

  it('should expose the complete catalog when the default playlist is a subset', () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(createJsonResponse({tracks: TRACKS, version: 1}))
        .mockResolvedValueOnce(createJsonResponse({trackIds: ['two'], version: 1})),
    )

    return expect(loadPTrackQueueSource()).resolves.toEqual({
      defaultTracks: [TRACKS[1]],
      tracks: TRACKS,
    })
  })

  it('should reject playlist IDs missing from the track catalog', () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(createJsonResponse({tracks: TRACKS, version: 1}))
        .mockResolvedValueOnce(createJsonResponse({trackIds: ['missing'], version: 1})),
    )

    return expect(loadPTracks()).rejects.toThrow('Focus-room playlist references unknown tracks')
  })

  it('should reject duplicate track IDs in the catalog', () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(createJsonResponse({tracks: [TRACKS[0], TRACKS[0]], version: 1}))
        .mockResolvedValueOnce(createJsonResponse({trackIds: ['one'], version: 1})),
    )

    return expect(loadPTracks()).rejects.toThrow('Focus-room tracks have an invalid format')
  })

  it('should reject duplicate track IDs in the playlist', () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(createJsonResponse({tracks: TRACKS, version: 1}))
        .mockResolvedValueOnce(createJsonResponse({trackIds: ['one', 'one'], version: 1})),
    )

    return expect(loadPTracks()).rejects.toThrow('Focus-room playlist has an invalid format')
  })

  it('should return an empty selection for an empty playlist', () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(createJsonResponse({tracks: [], version: 1}))
        .mockResolvedValueOnce(createJsonResponse({trackIds: [], version: 1})),
    )

    return expect(loadPTracks()).resolves.toEqual([])
  })

  it('should use override URLs, the supplied signal, and production cache policy', async () => {
    const signal = new AbortController().signal
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createJsonResponse({tracks: [], version: 1}))
      .mockResolvedValueOnce(createJsonResponse({trackIds: [], version: 1}))
    vi.stubEnv('DEV', false)
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      loadPTracks({
        playlistUrl: 'https://pomo.test/playlist.json',
        signal,
        tracksUrl: 'https://pomo.test/tracks.json',
      }),
    ).resolves.toEqual([])
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://pomo.test/tracks.json',
      expect.objectContaining({cache: 'default', signal}),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://pomo.test/playlist.json',
      expect.objectContaining({cache: 'default', signal}),
    )
  })

  it.each([
    {
      responses: [createErrorResponse(400), createJsonResponse({trackIds: [], version: 1})],
      status: 400,
      type: 'tracks',
    },
    {
      responses: [createJsonResponse({tracks: [], version: 1}), createErrorResponse(404)],
      status: 404,
      type: 'playlist',
    },
  ])('should reject a failed $type request', async ({responses, status, type}) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(responses[0]).mockResolvedValueOnce(responses[1]),
    )

    await expect(loadPTracks()).rejects.toThrow(`Focus-room ${type} request failed: ${status}`)
  })

  it.each([
    {collection: null, label: 'null track collection'},
    {collection: {tracks: [null], version: 1}, label: 'null track'},
  ])('should reject a $label', ({collection}) => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(createJsonResponse(collection))
        .mockResolvedValueOnce(createJsonResponse({trackIds: [], version: 1})),
    )

    return expect(loadPTracks()).rejects.toThrow('Focus-room tracks have an invalid format')
  })

  it('should reject a null playlist', () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(createJsonResponse({tracks: [], version: 1}))
        .mockResolvedValueOnce(createJsonResponse(null)),
    )

    return expect(loadPTracks()).rejects.toThrow('Focus-room playlist has an invalid format')
  })

  it('should propagate a catalog JSON read failure', () => {
    const jsonError = new Error('invalid JSON')
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({json: () => Promise.reject(jsonError), ok: true, status: 200})
        .mockResolvedValueOnce(createJsonResponse({trackIds: [], version: 1})),
    )

    return expect(loadPTracks()).rejects.toBe(jsonError)
  })
})
