import {createTrimPath} from './trim-path'
import {createTrimPathSeparator} from './trim-path-separator'

const MAX_URL_LENGTH = 300
const MAX_URL_COUNT = 100

/**
 * @deprecated
 */
export const createJoinUrl = (
  separator: string = '/',
  max: number = MAX_URL_LENGTH,
  maxCount: number = MAX_URL_COUNT,
) => {
  const dedupSeparator = createTrimPathSeparator(separator)
  const trimPath = createTrimPath(separator)

  return (...urls: string[]): string => {
    if (process.env.NODE_ENV === 'development' && urls.length > maxCount) {
      console.warn('please do not pass string url list too long')
    }

    const _urls = urls.slice(0, maxCount)

    return _urls
      .map((url) => {
        if (process.env.NODE_ENV === 'development' && url.length > max) {
          console.warn('please do not pass a string url too long')
        }

        const maxedUrl = url.slice(0, max)

        return trimPath(dedupSeparator(maxedUrl))
      })
      .join(separator)
  }
}

/**
 * @deprecated
 */
export const joinUrl = createJoinUrl()
