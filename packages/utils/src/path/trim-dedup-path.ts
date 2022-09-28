export const createTrimDedupRegExp = (pathSeparator: string = '/') => {
  return RegExp(`[${pathSeparator}]+`, 'giu')
}

export const createTrimDedupPath = (pathSeparator: string = '/') => {
  const MID_TRIM_URL_REGX = createTrimDedupRegExp(pathSeparator)
  return (path: string, replaceValue: string = pathSeparator): string => {
    return path.replace(MID_TRIM_URL_REGX, replaceValue)
  }
}

/**
 * 좌우와 가운데 '/' 패스도 변경 합니다
 * @param path
 * @param replaceValue
 */
export const trimDedupPath = createTrimDedupPath()
