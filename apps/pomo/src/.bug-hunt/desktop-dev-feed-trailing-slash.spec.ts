/** @vitest-environment node */
import {afterEach, expect, it, vi} from 'vitest'

const mocks = vi.hoisted(() => ({httpFetch: vi.fn()}))

vi.mock('../features/http-client', () => ({httpFetch: mocks.httpFetch}))

import {createFeedFetcher} from '../features/focus-room-feed/feed-runtime'

afterEach(() => {
  mocks.httpFetch.mockReset()
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

it('should resolve trailing-slash dev feed URLs to the local desktop server', async () => {
  vi.stubEnv('VITE_POMO_IS_DESKTOP', 'true')
  vi.stubEnv('VITE_POMO_PUBLIC_ORIGIN', 'https://www.pomofi.io')
  vi.stubGlobal('location', {origin: 'http://127.0.0.1:1420'})
  vi.spyOn(AbortSignal, 'timeout').mockReturnValue(AbortSignal.abort())
  mocks.httpFetch.mockResolvedValue(new Response('feed', {status: 200}))

  await createFeedFetcher()('https://www.pomofi.io/__dev/feeds/rss.xml/')

  const calledUrl = mocks.httpFetch.mock.calls[0]?.[0] as string
  expect(new URL(calledUrl).origin).toBe('http://127.0.0.1:1420')
  expect(new URL(calledUrl).pathname).toBe('/__dev/feeds/rss.xml')
})
