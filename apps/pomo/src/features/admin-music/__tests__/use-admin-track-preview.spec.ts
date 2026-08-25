/** @vitest-environment jsdom */

import {afterEach, expect, it, vi} from 'vitest'

import {useAdminTrackPreview} from '../use-admin-track-preview'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it('should load a private playback URL and clear playback errors when ready', async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
    Response.json({
      expiresAt: '2026-08-26T12:00:00.000Z',
      url: 'https://example.com/private-track.mp3',
    }),
  )
  vi.stubGlobal('fetch', fetcher)
  const controller = useAdminTrackPreview({trackId: 'track/id'})

  await controller.startPlayback()

  expect(fetcher).toHaveBeenCalledWith('/api/admin/music/tracks/track%2Fid/playback')
  expect(controller.loading()).toBe(false)
  expect(controller.playbackUrl()).toBe('https://example.com/private-track.mp3')
  controller.onPlaybackError()
  expect(controller.playbackUrl()).toBeNull()
  expect(controller.errorMessage()).toContain('다시 시도해 주세요')
  controller.onPlaybackReady()
  expect(controller.errorMessage()).toBeNull()
})

it('should expose a request failure and stop loading', async () => {
  const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, {status: 503})))
  const controller = useAdminTrackPreview({trackId: 'track-id'})

  await controller.startPlayback()

  expect(controller.loading()).toBe(false)
  expect(controller.errorMessage()).toBe('미리듣기를 불러오지 못했습니다.')
  expect(error).toHaveBeenCalledWith(
    'Failed to load admin track preview',
    expect.objectContaining({message: 'Playback access failed with status 503'}),
  )
})
