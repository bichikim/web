export const usesRemotePublicOrigin = (): boolean =>
  import.meta.env.VITE_POMO_IS_APPS_IN_TOSS === 'true' ||
  import.meta.env.VITE_POMO_IS_DESKTOP === 'true' ||
  (import.meta.env.VITE_POMO_IS_MOBILE === 'true' && !import.meta.env.DEV)

/** Resolves the application origin for public links and API response validation. */
export const getRuntimePublicOrigin = (): string =>
  usesRemotePublicOrigin() || typeof globalThis.location === 'undefined'
    ? import.meta.env.VITE_POMO_PUBLIC_ORIGIN
    : globalThis.location.origin
