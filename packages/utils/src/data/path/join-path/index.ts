import {flatten} from 'es-toolkit/compat'

export const joinPath = (...paths: string[]) => {
  return flatten(paths.map((path) => path.split('/').filter(Boolean))).join('/')
}
