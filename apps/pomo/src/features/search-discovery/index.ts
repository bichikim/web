import {SEARCH_CONFIG} from './canonical'
import {VERCEL_CDN_CACHE_CONTROL_HEADER} from '../../server/http/headers'

const CDN_CACHE_SECONDS = 86_400

const escapeXml = (value: string): string =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

const getCanonicalUrls = (): ReadonlyArray<string> => {
  const originUrl = new URL(SEARCH_CONFIG.origin)

  return SEARCH_CONFIG.indexablePaths.map((pathname) => {
    const canonicalUrl = new URL(pathname, originUrl)

    if (canonicalUrl.origin !== originUrl.origin) {
      throw new Error(`Search path must stay on the configured origin: ${pathname}`)
    }

    return canonicalUrl.href
  })
}

const renderUrl = (url: string): string => `  <url>\n    <loc>${escapeXml(url)}</loc>\n  </url>`

const renderSitemap = (): string => `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${getCanonicalUrls().map(renderUrl).join('\n')}
</urlset>
`

/** Returns the canonical search paths as an XML sitemap response. */
export const createSitemapResponse = (request: Request): Response =>
  new Response(request.method === 'HEAD' ? null : renderSitemap(), {
    headers: {
      'Cache-Control': 'public, max-age=0, must-revalidate',
      'Content-Type': 'application/xml; charset=utf-8',
      [VERCEL_CDN_CACHE_CONTROL_HEADER]: `public, max-age=${CDN_CACHE_SECONDS}`,
      'X-Content-Type-Options': 'nosniff',
    },
  })
