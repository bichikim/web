import {resolveUrl} from './resolve-url'
import {trimPath} from './trim-path'
import {removeFile} from './remove-file'

export const removeDeeps = (path: string, deeps: number) => {
  const pathList = trimPath(removeFile(trimPath(resolveUrl(path)))).split('/')

  pathList.splice(pathList.length - deeps)

  return pathList.join('/')
}
