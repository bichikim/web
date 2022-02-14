import type {Data} from './types'

export const shallowUpdate = (target: Data, source: Data) => {
  Object.keys(source).forEach((key) => {
    target[key] = source[key]
  })
}
