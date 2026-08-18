const POMO_LAYOUT_PATHS: ReadonlySet<string> = new Set(['/', '/dialogue'])

const normalizePathname = (pathname: string) => pathname.replace(/\/+$/u, '') || '/'

export const isPomoHomePath = (pathname: string) => normalizePathname(pathname) === '/'

export const usesPomoLayout = (pathname: string) =>
  POMO_LAYOUT_PATHS.has(normalizePathname(pathname))
