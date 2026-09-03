const DEFAULT_ROOT_FONT_SIZE_PIXELS = 16

/** Converts a CSS pixel measurement from a browser or native API to rem. */
export const cssPixelsToRem = (pixels: number): string => {
  const rootFontSize =
    typeof document === 'undefined'
      ? DEFAULT_ROOT_FONT_SIZE_PIXELS
      : Number.parseFloat(getComputedStyle(document.documentElement).fontSize)
  const resolvedRootFontSize =
    Number.isFinite(rootFontSize) && rootFontSize > 0 ? rootFontSize : DEFAULT_ROOT_FONT_SIZE_PIXELS

  return `${pixels / resolvedRootFontSize}rem`
}
