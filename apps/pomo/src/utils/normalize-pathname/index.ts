/** Removes trailing slashes while preserving the root pathname. */
export const normalizePathname = (pathname: string): string => pathname.replace(/\/+$/u, '') || '/'
