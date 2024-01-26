import {resolveUrl} from './resolve-url'
import {trimPath} from './trim-path'

export const getPathDeeps = (path: string): number => {
  return trimPath(resolveUrl(path)).split('/').length - 1
}
