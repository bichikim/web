/** Resolves standalone player navigation and rejects routes outside the player. */
export const handleRelaxRequest = (request: Request): Response | null => {
  const url = new URL(request.url)
  const pathname = url.pathname.replace(/\/$/u, '') || '/'

  if (pathname !== '/' && pathname !== '/relax') {
    return new Response(null, {headers: {'Cache-Control': 'no-store'}, status: 404})
  }

  // Slowcove stays a player even with legacy Pomo layout queries; it has no
  // integrated-app escape navigation in this dedicated deployment.
  return null
}
