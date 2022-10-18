export const createDedupSeparatorRegExp = (pathSeparator: string = '/') => {
  return RegExp(`[${pathSeparator}]+`, 'giu')
}
const MAX_URL_LENGTH = 300

export const createDedupSeparator = (pathSeparator: string = '/', max: number = MAX_URL_LENGTH) => {
  const MID_TRIM_URL_REGX = createDedupSeparatorRegExp(pathSeparator)
  return (path: string, replaceValue: string = pathSeparator): string => {
    if (process.env.NODE_ENV === 'development' && path.length > max) {
      console.warn('please do not pass a string path too long')
    }
    return path.slice(0, max).replace(MID_TRIM_URL_REGX, replaceValue)
  }
}

/**
 * 좌우와 가운데 '/' 패스도 변경 합니다
 * @param path
 * @param replaceValue
 */
export const dedupSeparator = createDedupSeparator()
