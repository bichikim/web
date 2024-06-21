import {flatten} from '@winter-love/lodash'

export const joinPath = (...paths: string[]) => {
  return flatten(paths.map((path) => path.split('/').filter(Boolean))).join('/')
}
