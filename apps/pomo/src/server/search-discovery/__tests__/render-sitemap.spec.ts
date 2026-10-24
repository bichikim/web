/** @vitest-environment node */
import {expect, it} from 'vitest'
import {renderSitemap} from '../render-sitemap'

it('should escape query separators in canonical sitemap URLs', () => {
  const sitemap = renderSitemap({
    indexablePaths: ['/search?first=1&second=2'],
    origin: 'https://www.pomofi.io',
  })

  expect(sitemap).toContain('first=1&amp;second=2')
})

it('should reject a canonical path that leaves the configured origin', () => {
  expect(() =>
    renderSitemap({
      indexablePaths: ['https://untrusted.example/path'],
      origin: 'https://www.pomofi.io',
    }),
  ).toThrow('Search path must stay on the configured origin')
})

it('should validate the origin before reading paths', () => {
  const reads: string[] = []
  const options = {
    get indexablePaths(): ReadonlyArray<string> {
      reads.push('paths')
      throw new Error('paths read before the origin was validated')
    },
    get origin(): string {
      reads.push('origin')
      return 'invalid'
    },
  }

  expect(() => renderSitemap(options)).toThrow(TypeError)
  expect(reads).toEqual(['origin'])
})
