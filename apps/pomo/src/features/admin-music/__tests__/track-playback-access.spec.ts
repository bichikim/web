/** @vitest-environment jsdom */

import {afterEach, expect, it, vi} from 'vitest'

import {requestAdminTrackPlaybackAccess} from '../track-playback-access'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

it('should request and validate administrator playback access', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      Response.json({
        expiresAt: '2026-09-03T12:00:00.000Z',
        url: 'https://audio.example/private.mp3',
      }),
    ),
  )

  await expect(requestAdminTrackPlaybackAccess('track/id')).resolves.toEqual({
    expiresAt: '2026-09-03T12:00:00.000Z',
    url: 'https://audio.example/private.mp3',
  })
  expect(fetch).toHaveBeenCalledWith('/api/admin/music/tracks/track%2Fid/playback')
})

it('should reject an unsuccessful or malformed playback response', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce(new Response(null, {status: 503}))
      .mockResolvedValueOnce(Response.json({expiresAt: 'invalid', url: '/relative.mp3'})),
  )

  await expect(requestAdminTrackPlaybackAccess('track-one')).rejects.toThrow('status 503')
  await expect(requestAdminTrackPlaybackAccess('track-one')).rejects.toThrow()
})
