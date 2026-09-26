/** @vitest-environment node */
import {afterEach, expect, it, vi} from 'vitest'

const mocks = vi.hoisted(() => ({httpFetch: vi.fn()}))

vi.mock('../../http-client', () => ({httpFetch: mocks.httpFetch}))

import {
  createFeedFetcher,
  findRemovableExpiredDialogues,
  getFeedGenerationProgress,
} from '../feed-runtime'

afterEach(() => {
  mocks.httpFetch.mockReset()
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

it('should calculate bounded generation progress', () => {
  expect(getFeedGenerationProgress(1, 3)).toBe(33)
  expect(getFeedGenerationProgress(4, 3)).toBe(100)
})

it('should return zero when the total size is unknown', () => {
  expect(getFeedGenerationProgress(0, 0)).toBe(0)
})

it('should create a no-store feed request with a bounded timeout', () => {
  const signal = AbortSignal.abort()
  vi.spyOn(AbortSignal, 'timeout').mockReturnValue(signal)
  mocks.httpFetch.mockReturnValue('response')

  expect(createFeedFetcher()('/api/feed')).toBe('response')
  expect(mocks.httpFetch).toHaveBeenCalledWith('/api/feed', {cache: 'no-store', signal})
  expect(AbortSignal.timeout).toHaveBeenCalledWith(15_000)
})

it('should resolve stale remote development feeds to the local desktop server', async () => {
  vi.stubEnv('VITE_POMO_IS_DESKTOP', 'true')
  vi.stubEnv('VITE_POMO_PUBLIC_ORIGIN', 'https://www.pomofi.io')
  vi.stubGlobal('location', {origin: 'http://127.0.0.1:1420'})
  vi.spyOn(AbortSignal, 'timeout').mockReturnValue(AbortSignal.abort())
  mocks.httpFetch.mockResolvedValue(new Response('feed', {status: 200}))

  await createFeedFetcher()('https://www.pomofi.io/__dev/feeds/rss.xml')

  const expectedUrl = new URL('http://127.0.0.1:1420/__dev/feeds/rss.xml')
  expectedUrl.searchParams.set('timeZone', Intl.DateTimeFormat().resolvedOptions().timeZone)
  expect(mocks.httpFetch).toHaveBeenCalledWith(
    expectedUrl.href,
    expect.objectContaining({cache: 'no-store'}),
  )
})

it('should preserve third-party feeds with a development-feed path', async () => {
  vi.stubEnv('VITE_POMO_IS_DESKTOP', 'true')
  vi.stubEnv('VITE_POMO_PUBLIC_ORIGIN', 'https://www.pomofi.io')
  vi.stubGlobal('location', {origin: 'http://127.0.0.1:1420'})
  vi.spyOn(AbortSignal, 'timeout').mockReturnValue(AbortSignal.abort())
  mocks.httpFetch.mockResolvedValue(new Response('feed', {status: 200}))

  await createFeedFetcher()('https://example.test/__dev/feeds/rss.xml')

  expect(mocks.httpFetch).toHaveBeenCalledWith(
    'https://example.test/__dev/feeds/rss.xml',
    expect.objectContaining({cache: 'no-store'}),
  )
})

it('should keep only expired dialogues that are not scheduled', () => {
  const expired = [{dialogueId: 'scheduled'}, {dialogueId: 'removable'}] as unknown as Parameters<
    typeof findRemovableExpiredDialogues
  >[0]['expired']

  expect(
    findRemovableExpiredDialogues({
      expired,
      isDialogueScheduled: (dialogueId) => dialogueId === 'scheduled',
    }),
  ).toEqual([expired[1]])
})
