/** @vitest-environment node */
import {afterEach, expect, it, vi} from 'vitest'

afterEach(() => {
  vi.doUnmock('src/features/search-discovery')
  vi.resetModules()
})

it('should escape query separators in canonical sitemap URLs', async () => {
  vi.doMock('src/features/search-discovery', () => ({
    SEARCH_CONFIG: {
      indexablePaths: ['/search?first=1&second=2'],
      origin: 'https://www.pomofi.io',
    },
  }))
  vi.resetModules()
  const {createSitemapResponse} = await import('../create-sitemap-response')

  const response = createSitemapResponse(new Request('https://www.pomofi.io/sitemap.xml'))

  await expect(response.text()).resolves.toContain('first=1&amp;second=2')
})

it('should reject a canonical path that leaves the configured origin', async () => {
  vi.doMock('src/features/search-discovery', () => ({
    SEARCH_CONFIG: {
      indexablePaths: ['https://untrusted.example/path'],
      origin: 'https://www.pomofi.io',
    },
  }))
  vi.resetModules()
  const {createSitemapResponse} = await import('../create-sitemap-response')

  expect(() => createSitemapResponse(new Request('https://www.pomofi.io/sitemap.xml'))).toThrow(
    'Search path must stay on the configured origin',
  )
})
