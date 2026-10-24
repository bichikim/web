import {SEARCH_CONFIG} from 'src/features/search-discovery'
import {VERCEL_CDN_CACHE_CONTROL_HEADER} from '../http/headers'
import {renderSitemap} from './render-sitemap'

const CDN_CACHE_SECONDS = 86_400

/** Returns the canonical search paths as an XML sitemap response. */
export const createSitemapResponse = (request: Request): Response =>
  new Response(request.method === 'HEAD' ? null : renderSitemap(SEARCH_CONFIG), {
    headers: {
      'Cache-Control': 'public, max-age=0, must-revalidate',
      'Content-Type': 'application/xml; charset=utf-8',
      [VERCEL_CDN_CACHE_CONTROL_HEADER]: `public, max-age=${CDN_CACHE_SECONDS}`,
      'X-Content-Type-Options': 'nosniff',
    },
  })
