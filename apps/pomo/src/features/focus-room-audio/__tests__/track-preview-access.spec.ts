import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

const sessionMocks = vi.hoisted(() => ({readStoredAppSession: vi.fn()}))

vi.mock('../../user-auth/app-session', () => sessionMocks)

import {loadTrackPreviewSource} from '../track-preview-access'

const TRACK_ID = '019d1990-1dc9-7255-a7b5-f9459dfaf781'
const ASSET_ID = '019d1990-1dc9-7255-a7b5-f9459dfaf782'
const createPreviewAccessResponse = () =>
  Response.json({
    mode: 'preview',
    url: `/api/music/tracks/${TRACK_ID}/preview?asset=${ASSET_ID}&token=preview-token`,
  })

describe('loadTrackPreviewSource', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_POMO_IS_APPS_IN_TOSS', '')
    vi.stubEnv('VITE_POMO_IS_DESKTOP', '')
    vi.stubEnv('VITE_POMO_PUBLIC_ORIGIN', 'https://www.pomofi.io')
    sessionMocks.readStoredAppSession.mockReset().mockResolvedValue(null)
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:pomo-track-preview')
    vi.spyOn(URL, 'revokeObjectURL').mockReturnValue(undefined)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it.each([
    ['Apps in Toss', 'VITE_POMO_IS_APPS_IN_TOSS'],
    ['desktop', 'VITE_POMO_IS_DESKTOP'],
  ] as const)(
    'should use the Pomo API origin for %s preview access and audio',
    async (_name, key) => {
      vi.stubEnv(key, 'true')
      vi.stubEnv('VITE_POMO_PUBLIC_ORIGIN', 'https://www.pomofi.io')
      sessionMocks.readStoredAppSession.mockResolvedValue('app-token')
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(
          Response.json({
            mode: 'preview',
            url: `/api/music/tracks/${TRACK_ID}/preview?asset=${ASSET_ID}&token=preview-token`,
          }),
        )
        .mockResolvedValueOnce(
          new Response('preview', {
            headers: {'Content-Length': '7', 'Content-Type': 'audio/mpeg'},
          }),
        )
      vi.stubGlobal('fetch', fetcher)

      const result = await loadTrackPreviewSource(TRACK_ID)

      expect(result).toMatchObject({ok: true, source: 'blob:pomo-track-preview'})
      expect(fetcher).toHaveBeenNthCalledWith(
        1,
        `https://www.pomofi.io/api/music/tracks/${TRACK_ID}/access`,
        expect.objectContaining({headers: {Authorization: 'Bearer app-token'}}),
      )
      expect(fetcher).toHaveBeenNthCalledWith(
        2,
        `https://www.pomofi.io/api/music/tracks/${TRACK_ID}/preview?asset=${ASSET_ID}&token=preview-token`,
      )
      if (result.ok) {
        result.release?.()
      }
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:pomo-track-preview')
    },
  )

  it('should load a signed bounded preview Blob for a logged-in user without entitlement', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({
          mode: 'preview',
          url: `/api/music/tracks/${TRACK_ID}/preview?asset=${ASSET_ID}&token=preview-token`,
        }),
      )
      .mockResolvedValueOnce(
        new Response('preview', {
          headers: {'Content-Length': '7', 'Content-Type': 'audio/mpeg'},
        }),
      )
    vi.stubGlobal('fetch', fetcher)

    await expect(loadTrackPreviewSource(TRACK_ID)).resolves.toMatchObject({
      ok: true,
      source: 'blob:pomo-track-preview',
    })
    expect(fetcher).toHaveBeenNthCalledWith(1, `/api/music/tracks/${TRACK_ID}/access`, {
      cache: 'no-store',
      credentials: 'include',
      headers: undefined,
    })
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      `/api/music/tracks/${TRACK_ID}/preview?asset=${ASSET_ID}&token=preview-token`,
    )
  })

  it('should report that login is required for an anonymous user', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(Response.json({error: 'unauthorized'}, {status: 401})),
    )

    await expect(loadTrackPreviewSource(TRACK_ID)).resolves.toEqual({
      ok: false,
      reason: 'authentication-required',
    })
  })

  it('should send the app session and accept an HTTPS full-playback URL', async () => {
    sessionMocks.readStoredAppSession.mockResolvedValue('app-token')
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(
        Response.json({
          expiresAt: '2026-08-23T01:15:00.000Z',
          mode: 'full',
          url: 'https://audio.pomofi.io/tracks/asset/source.mp3?token=signed',
        }),
      ),
    )

    await expect(loadTrackPreviewSource(TRACK_ID)).resolves.toEqual({
      ok: true,
      source: 'https://audio.pomofi.io/tracks/asset/source.mp3?token=signed',
    })
    expect(fetch).toHaveBeenCalledWith(`/api/music/tracks/${TRACK_ID}/access`, {
      cache: 'no-store',
      credentials: 'include',
      headers: {Authorization: 'Bearer app-token'},
    })
  })

  it('should reject an insecure full-playback URL from the server boundary', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(
        Response.json({
          expiresAt: '2026-08-23T01:15:00.000Z',
          mode: 'full',
          url: 'http://attacker.example/source.mp3',
        }),
      ),
    )

    await expect(loadTrackPreviewSource(TRACK_ID)).rejects.toThrow('invalid format')
  })

  it.each([
    ['null', null],
    ['a primitive', 'invalid'],
    ['a preview without a string URL', {mode: 'preview', url: 42}],
    ['a malformed preview URL', {mode: 'preview', url: 'http://['}],
    ['an incomplete full access', {mode: 'full', url: 'https://audio.pomofi.io/source.mp3'}],
    [
      'a malformed full URL',
      {expiresAt: '2026-08-23T01:15:00.000Z', mode: 'full', url: 'http://['},
    ],
  ])('should reject %s access payload', async (_name, payload) => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(Response.json(payload)))

    await expect(loadTrackPreviewSource(TRACK_ID)).rejects.toThrow('invalid format')
  })

  it('should omit authorization when app session storage is unavailable', async () => {
    sessionMocks.readStoredAppSession.mockRejectedValue(new Error('storage unavailable'))
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({error: 'unauthorized'}, {status: 401}))
    vi.stubGlobal('fetch', fetcher)

    await expect(loadTrackPreviewSource(TRACK_ID)).resolves.toEqual({
      ok: false,
      reason: 'authentication-required',
    })
    expect(fetcher).toHaveBeenCalledWith(`/api/music/tracks/${TRACK_ID}/access`, {
      cache: 'no-store',
      credentials: 'include',
      headers: undefined,
    })
  })

  it('should reject a failed track access request other than unauthorized', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(Response.json({error: 'unavailable'}, {status: 503})),
    )

    await expect(loadTrackPreviewSource(TRACK_ID)).rejects.toThrow(
      'Track access request failed: 503',
    )
  })

  it.each([
    ['an unsuccessful response', new Response(null, {status: 500})],
    [
      'a wrong content type',
      new Response('preview', {
        headers: {'Content-Length': '7', 'Content-Type': 'text/plain'},
      }),
    ],
    [
      'a fractional content length',
      new Response('preview', {
        headers: {'Content-Length': '1.5', 'Content-Type': 'audio/mpeg'},
      }),
    ],
    [
      'an empty content length',
      new Response(null, {headers: {'Content-Length': '0', 'Content-Type': 'audio/mpeg'}}),
    ],
    [
      'an oversized content length',
      new Response(null, {
        headers: {'Content-Length': '2097153', 'Content-Type': 'audio/mpeg'},
      }),
    ],
  ])('should reject preview audio with %s', async (_name, audioResponse) => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(createPreviewAccessResponse())
        .mockResolvedValueOnce(audioResponse),
    )

    await expect(loadTrackPreviewSource(TRACK_ID)).rejects.toThrow(
      'Track preview audio response is invalid',
    )
  })

  it('should reject preview audio whose body length does not match its header', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(createPreviewAccessResponse())
        .mockResolvedValueOnce(
          new Response('preview', {
            headers: {'Content-Length': '8', 'Content-Type': 'audio/mpeg'},
          }),
        ),
    )

    await expect(loadTrackPreviewSource(TRACK_ID)).rejects.toThrow(
      'Track preview audio length is invalid',
    )
  })
})
