/**
 * isSSr
 */
export const isSSR = () => typeof globalThis.window === 'undefined'
