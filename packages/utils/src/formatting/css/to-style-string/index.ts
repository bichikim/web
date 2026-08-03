export const toStringStyle = (
  target: string | undefined | null | Record<string, string | number> | string[],
) => {
  if (!target) {
    return ''
  }

  if (typeof target === 'string') {
    return target
  }

  if (Array.isArray(target)) {
    return target
      .filter((style) => style.length > 0)
      .map((style) => (style.trimEnd().endsWith(';') ? style : `${style};`))
      .join('')
  }

  return Object.entries(target).reduce((result, [key, value]) => {
    return `${result}${key}:${value};`
  }, '')
}

/**
 * @deprecated use `toStringStyle` instead
 */
export const toStyleString = toStringStyle
export const sx = toStringStyle
