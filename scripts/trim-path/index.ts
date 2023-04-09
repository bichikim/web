type TrimType = 'left' | 'right' | 'both'
export const createTrimPathRegExp = (pathSeparator: string = '/', type: TrimType = 'both') => {
  switch (type) {
    case 'left': {
      return RegExp(`^${pathSeparator}+`, 'giu')
    }
    case 'right': {
      return RegExp(`${pathSeparator}+$`, 'giu')
    }
    case 'both': {
      return RegExp(`^[${pathSeparator}]+|[${pathSeparator}]+$`, 'giu')
    }
  }
  // return RegExp(`^[${pathSeparator}]+|[${pathSeparator}]+$`, 'giu')
}

const MAX_URL_LENGTH = 300

export const createTrimPath = (
  pathSeparator: string = '/',
  max: number = MAX_URL_LENGTH,
  type: TrimType = 'both',
) => {
  const TRIM_PATH_REGEX = createTrimPathRegExp(pathSeparator, type)
  return (path: string, replaceValue: string = '') => {
    if (process.env.NODE_ENV === 'development' && path.length > max) {
      console.warn('please do not pass a string path too long')
    }
    return path.slice(0, max).replace(TRIM_PATH_REGEX, replaceValue)
  }
}

export const trimPath = createTrimPath()
