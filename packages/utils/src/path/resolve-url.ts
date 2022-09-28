import {trimPath} from './trim-path'
import {trimDedupPath} from './trim-dedup-path'

const MAX_RESOLVE_URL = 200

export const createResolveUrl = (separator: string = '/', max: number = MAX_RESOLVE_URL) => {
  return (...urls: string[]): string => {
    return urls
      .map((url) => {
        const maxedUrl = url.slice(0, max)
        return trimPath(trimDedupPath(maxedUrl))
      })
      .join(separator)
  }
}

export const resolveUrl = createResolveUrl()
