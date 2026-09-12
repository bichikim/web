/** @vitest-environment jsdom */

import {afterEach, expect, it, vi} from 'vitest'

const submissionMocks = vi.hoisted(() => ({clear: vi.fn()}))

vi.mock('@solidjs/router', () => ({
  action: vi.fn((clientAction) => clientAction),
  useAction: vi.fn((clientAction) => clientAction),
  useSubmission: vi.fn(() => ({clear: submissionMocks.clear, pending: false})),
}))

import {useAdminTrackPreview} from '../use-admin-track-preview'

afterEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it('should load a private playback URL and clear playback errors when ready', async () => {
  const now = () => Date.parse('2026-08-26T11:45:00.000Z')
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
    Response.json({
      expiresAt: '2026-08-26T12:00:00.000Z',
      url: 'https://example.com/private-track.mp3',
    }),
  )
  vi.stubGlobal('fetch', fetcher)
  const controller = useAdminTrackPreview({trackId: 'track/id'}, now)

  await controller.startPlayback()

  expect(fetcher).toHaveBeenCalledWith('/api/admin/music/tracks/track%2Fid/playback')
  expect(controller.loading()).toBe(false)
  expect(controller.playbackUrl()).toBe('https://example.com/private-track.mp3')
  expect(submissionMocks.clear).toHaveBeenCalledOnce()
  controller.onPlaybackError()
  expect(controller.playbackUrl()).toBeNull()
  expect(controller.errorMessage()).toContain('다시 시도해 주세요')
  controller.onPlaybackReady()
  expect(controller.errorMessage()).toBeNull()
})

it('should expose a request failure and stop loading', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, {status: 503})))
  const controller = useAdminTrackPreview({trackId: 'track-id'})

  await controller.startPlayback()

  expect(controller.loading()).toBe(false)
  expect(controller.errorMessage()).toBe('미리듣기를 불러오지 못했습니다.')
})

it.each(['2026-08-26T12:15:00.000Z', '2026-08-26T12:00:00.000Z'])(
  'should validate renewed expiry %s against the supplied clock',
  async (expiresAt) => {
    const now = vi.fn(() => Date.parse('2026-08-26T11:45:00.000Z'))
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({expiresAt: '2026-08-26T12:00:00.000Z', url: 'https://example.com/old.mp3'}),
      )
      .mockResolvedValueOnce(Response.json({expiresAt, url: 'https://example.com/new.mp3'}))
    vi.stubGlobal('fetch', fetcher)
    const controller = useAdminTrackPreview({trackId: 'track-id'}, now)
    await controller.startPlayback()
    now.mockReturnValue(Date.parse('2026-08-26T11:59:29.999Z'))
    expect(controller.preparePlayback(12, true, 'play')).toBe(true)
    expect(fetcher).toHaveBeenCalledOnce()
    now.mockReturnValue(Date.parse('2026-08-26T11:59:30.000Z'))
    expect(controller.preparePlayback(12, true, 'play')).toBe(false)
    await vi.waitFor(() => expect(controller.loading()).toBe(false))
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(controller.playbackUrl()).toBe(
      expiresAt === '2026-08-26T12:15:00.000Z' ? 'https://example.com/new.mp3' : null,
    )
  },
)
