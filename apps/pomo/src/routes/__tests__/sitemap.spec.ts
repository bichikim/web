import {describe, expect, it} from 'vitest'

import {GET, HEAD} from '../sitemap.xml'
import {invokeApiRoute} from '../api/__tests__/invoke'

const SITEMAP_URL = 'https://www.pomofi.io/sitemap.xml'

describe('sitemap API', () => {
  it('should return the configured canonical paths as XML', async () => {
    const response = await invokeApiRoute(GET, new Request(SITEMAP_URL))

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('application/xml; charset=utf-8')
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=0, must-revalidate')
    expect(response.headers.get('Vercel-CDN-Cache-Control')).toBe('public, max-age=86400')
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
    await expect(response.text()).resolves.toBe(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://www.pomofi.io/</loc>
  </url>
  <url>
    <loc>https://www.pomofi.io/refund-policy</loc>
  </url>
</urlset>
`)
  })

  it('should return matching headers without a body for HEAD', async () => {
    const getResponse = await invokeApiRoute(GET, new Request(SITEMAP_URL))
    const headResponse = await invokeApiRoute(HEAD, new Request(SITEMAP_URL, {method: 'HEAD'}))

    expect(headResponse.status).toBe(200)
    expect(headResponse.headers).toEqual(getResponse.headers)
    await expect(headResponse.text()).resolves.toBe('')
  })
})
