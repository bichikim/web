import {RELAX_FULL_APP_HREF} from 'src/features/relax-player'

/** Resolves standalone player navigation and rejects routes outside the player. */
export const handleRelaxRequest = (request: Request): Response | null => {
  const url = new URL(request.url)
  const pathname = url.pathname.replace(/\/$/u, '') || '/'

  if (pathname !== '/' && pathname !== '/relax') {
    return new Response(null, {headers: {'Cache-Control': 'no-store'}, status: 404})
  }

  if (url.searchParams.get('layout') === 'all-in-one') {
    return new Response(null, {
      headers: {'Cache-Control': 'no-store', Location: RELAX_FULL_APP_HREF},
      status: 302,
    })
  }

  return null
}
