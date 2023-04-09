import {trimPath} from '../trim-path'
import {dedupSeparator} from '../depub-separator'

const MAX_URL_LENGTH = 300
const MAX_URL_COUNT = 100

export const createResolveUrl = (
  separator: string = '/',
  max: number = MAX_URL_LENGTH,
  maxCount: number = MAX_URL_COUNT,
) => {
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

export const resolveUrl = createResolveUrl()
