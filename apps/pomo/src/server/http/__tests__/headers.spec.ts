import {expect, it} from 'vitest'

import {VERCEL_CDN_CACHE_CONTROL_HEADER} from '../headers'

it('should expose the canonical Vercel CDN cache-control header', () => {
  expect(VERCEL_CDN_CACHE_CONTROL_HEADER).toBe('Vercel-CDN-Cache-Control')
})
