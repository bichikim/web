/** @vitest-environment node */

import {afterEach, expect, it, vi} from 'vitest'

import {loadSoundEffects} from '..'

const EFFECT = {
  artworkUrl: '/audio/artwork/waves.png',
  durationSeconds: 300,
  id: 'waves',
  source: 'https://storage.pomofi.io/sound-effects/waves.mp3',
  title: {en: 'Waves', ko: '파도 소리'},
} as const

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

it('should load the versioned public sound-effect catalog', async () => {
  const fetchMock = vi
    .fn<typeof fetch>()
    .mockResolvedValue(Response.json({effects: [EFFECT], version: 1}))
  vi.stubGlobal('fetch', fetchMock)

  await expect(loadSoundEffects()).resolves.toEqual([EFFECT])
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
  vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(Response.json(catalog)))

  await expect(loadSoundEffects()).rejects.toThrow('Sound effects have an invalid format')
})

it('should reject an HTTP failure', async () => {
  vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(new Response(null, {status: 503})))

  await expect(loadSoundEffects()).rejects.toThrow('Sound effects request failed: 503')
})
