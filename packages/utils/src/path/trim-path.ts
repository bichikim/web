export const createTrimPathRegExp = (pathSeparator: string = '/') => {
  return RegExp(`^[${pathSeparator}]+|[${pathSeparator}]+$`, 'giu')
}

export const createTrimPath = (pathSeparator: string = '/') => {
  const TRIM_PATH_REGEX = createTrimPathRegExp(pathSeparator)
  return (path: string, replaceValue: string = '') => {
    return path.replace(TRIM_PATH_REGEX, replaceValue)
  }
}

export const trimPath = createTrimPath()
