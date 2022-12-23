export const toStyleString = (
  target: string | undefined | null | Record<string, string | number>,
) => {
  if (!target) {
    return ''
  }
  if (typeof target === 'string') {
    return target
  }
  return Object.entries(target).reduce((result, [key, value]) => {
    return `${result}${key}:${value};`
  }, '')
}
