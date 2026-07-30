export const createTrimPathRegExp = (pathSeparator: string = '/') => {
  return RegExp(`^[${pathSeparator}]+|[${pathSeparator}]+$`, 'giu')
}

const MAX_URL_LENGTH = 300

export const createTrimPath = (separator: string = '/', max: number = MAX_URL_LENGTH) => {
  const TRIM_PATH_REGEX = createTrimPathRegExp(separator)

  return (path: string, replaceValue: string = '') => {
    if (process.env.NODE_ENV === 'development' && path.length > max) {
      console.warn('please do not pass a string path too long')
    }

    return path.slice(0, max).replace(TRIM_PATH_REGEX, replaceValue)
  }
}

export const trimPath = createTrimPath()
