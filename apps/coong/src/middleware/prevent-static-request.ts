import {createMiddlewareFragment} from 'src/utils/middleware-helper'
import {memoize} from 'es-toolkit'

export const preventStaticRequest = createMiddlewareFragment({
  onRequest: async (event) => {
    // only run in development
    if (import.meta.env.PROD) {
      return
    }

    const {request} = event

    const {pathname} = new URL(request.url)

    // Block static asset requests early.
    if (isAssetRequestPathname(pathname)) {
      return new Response('Not Found', {status: 404})
    }
  },
})

const ASSET_EXTENSIONS = new Set([
  'js',
  'mjs',
  'cjs',
  'css',
  'map',
  'png',
  'jpg',
  'jpeg',
  'gif',
  'svg',
  'ico',
  'webp',
  'woff',
  'woff2',
  'ttf',
  'otf',
  'eot',
  'wasm',
  'json',
  'txt',
  'mp3',
  'wav',
  'ogg',
  'm4a',
])

/**
 * Returns true if the request is for a static asset (e.g. `.js`, `.css`).
 */
const isAssetRequestPathname = memoize((pathname: string): boolean => {
  const lastDotIndex = pathname.lastIndexOf('.')

  if (lastDotIndex < 0) {
    return false
  }

  const ext = pathname.slice(lastDotIndex + 1).toLowerCase()

  return ASSET_EXTENSIONS.has(ext)
})
