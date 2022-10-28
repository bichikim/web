import {trimPath} from './trim-path'
import {resolveUrl} from './resolve-url'

export const getPathDeeps = (path: string) => {
  return trimPath(resolveUrl(path)).split('/').length - 1
}
