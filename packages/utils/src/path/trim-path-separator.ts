export const createDedupSeparatorRegExp = (separator: string = '/') => {
  return RegExp(`[${separator}]+`, 'giu')
}
const MAX_URL_LENGTH = 300

/**
 * @deprecated
 */
export const createTrimPathSeparator = (separator: string = '/', max: number = MAX_URL_LENGTH) => {
  const MID_TRIM_URL_REGX = createDedupSeparatorRegExp(separator)

  return (path: string, replaceValue: string = separator): string => {
    if (process.env.NODE_ENV === 'development' && path.length > max) {
      console.warn('please do not pass a string path too long')
    }

    return path.slice(0, max).replace(MID_TRIM_URL_REGX, replaceValue)
  }
}

/**
 * @deprecated
 * 좌우와 가운데 중복 '//' 를 '/' 패스로 변경 합니다
 * @param path
 * @param replaceValue
 */
export const trimPathSeparator = createTrimPathSeparator()
