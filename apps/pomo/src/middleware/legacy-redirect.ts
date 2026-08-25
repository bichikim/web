import {SERVICE_POLICY_PATHS} from '../features/service-terms/policy-paths'

const HTTP_PERMANENT_REDIRECT = 308
const LEGACY_DIALOGUE_PATH = '/focus-room-dialogue'
const LEGACY_REDIRECT_PATHS: Readonly<Record<string, string>> = {
  '/focus-room': '/',
  [LEGACY_DIALOGUE_PATH]: '/dialogue',
  [SERVICE_POLICY_PATHS.legacy.privacy]: SERVICE_POLICY_PATHS.web.privacy,
  [SERVICE_POLICY_PATHS.legacy.terms]: SERVICE_POLICY_PATHS.web.terms,
}

/** Returns a permanent redirect for a known web legacy URL. */
export const handleLegacyRedirectRequest = (request: Request): Response | null => {
  const url = new URL(request.url)
  const legacyPathname = url.pathname.endsWith('/') ? url.pathname.slice(0, -1) : url.pathname
  const destination = LEGACY_REDIRECT_PATHS[legacyPathname]

  if (destination === undefined) {
    return null
  }

  const location =
    legacyPathname === LEGACY_DIALOGUE_PATH ? `${destination}${url.search}` : destination

  return new Response(null, {
    headers: {Location: location},
    status: HTTP_PERMANENT_REDIRECT,
  })
}
