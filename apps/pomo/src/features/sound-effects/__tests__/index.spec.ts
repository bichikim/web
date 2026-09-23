/** @vitest-environment node */

import {afterEach, expect, it, vi} from 'vitest'

const httpMocks = vi.hoisted(() => ({
  audioFetch: vi.fn(),
  httpFetch: vi.fn(),
}))

vi.mock('../../http-client', () => httpMocks)

import {loadSoundEffects} from '..'

const EFFECT = {
  artworkUrl: '/audio/artwork/waves.png',
  durationSeconds: 300,
  id: 'waves',
  source: 'https://storage.pomofi.io/sound-effects/waves.mp3',
  title: {en: 'Waves', ko: '파도 소리'},
} as const

afterEach(() => {
  httpMocks.audioFetch.mockReset()
  httpMocks.httpFetch.mockReset()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

it('should load the versioned public sound-effect catalog', async () => {
  const fetchMock = vi
    .fn<typeof fetch>()
    .mockResolvedValue(Response.json({effects: [EFFECT], version: 1}))
  httpMocks.audioFetch.mockImplementation((path: string, init: RequestInit) =>
    globalThis.fetch(`/audio/${path}`, init),
  )
  vi.stubGlobal('fetch', fetchMock)

  await expect(loadSoundEffects()).resolves.toEqual([EFFECT])
  expect(fetchMock).toHaveBeenCalledWith(
    '/audio/sound-effects.json',
    expect.objectContaining({cache: 'no-store', signal: undefined}),
  )
})

it('should load the local catalog during desktop development', async () => {
  const fetchMock = vi
    .fn<typeof fetch>()
    .mockResolvedValue(Response.json({effects: [EFFECT], version: 1}))
  vi.stubEnv('VITE_POMO_IS_DESKTOP', 'true')
  vi.stubGlobal('fetch', fetchMock)
  httpMocks.audioFetch.mockRejectedValue(new TypeError('remote asset unavailable'))

  await expect(loadSoundEffects()).resolves.toEqual([EFFECT])
  expect(httpMocks.audioFetch).not.toHaveBeenCalled()
  expect(fetchMock).toHaveBeenCalledWith(
    '/audio/sound-effects.json',
    expect.objectContaining({cache: 'no-store', signal: undefined}),
  )
})

it('should use an override URL and production cache policy', async () => {
  const signal = new AbortController().signal
  const fetchMock = vi
    .fn<typeof fetch>()
    .mockResolvedValue(Response.json({effects: [], version: 1}))
  vi.stubEnv('DEV', false)
  httpMocks.httpFetch.mockImplementation((url: string, init: RequestInit) =>
    globalThis.fetch(url, init),
  )
  vi.stubGlobal('fetch', fetchMock)

  await expect(
    loadSoundEffects({signal, url: 'https://pomo.example/sound-effects.json'}),
  ).resolves.toEqual([])
  expect(fetchMock).toHaveBeenCalledWith(
    'https://pomo.example/sound-effects.json',
    expect.objectContaining({cache: 'default', signal}),
  )
})

it.each([
  null,
  {effects: [{...EFFECT, id: ''}], version: 1},
  {effects: [{...EFFECT, title: {en: 'Waves', ko: ''}}], version: 1},
  {effects: [{...EFFECT}, {...EFFECT}], version: 1},
  {effects: [], version: 2},
])('should reject an invalid sound-effect catalog %#', async (catalog) => {
  httpMocks.audioFetch.mockImplementation((path: string, init: RequestInit) =>
    globalThis.fetch(`/audio/${path}`, init),
  )
  vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(Response.json(catalog)))

  await expect(loadSoundEffects()).rejects.toThrow('Sound effects have an invalid format')
})

it('should reject an HTTP failure', async () => {
  httpMocks.audioFetch.mockImplementation((path: string, init: RequestInit) =>
    globalThis.fetch(`/audio/${path}`, init),
  )
  vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(new Response(null, {status: 503})))

  await expect(loadSoundEffects()).rejects.toThrow('Sound effects request failed: 503')
})
