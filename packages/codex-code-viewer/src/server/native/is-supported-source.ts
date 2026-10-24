/** Identifies source extensions analyzed by the native TypeScript engine. */
export const isSupportedSource = (path: string): boolean => /\.[cm]?[jt]sx?$/u.test(path)
