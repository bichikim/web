import {isNode} from 'src/env/is-node'

export const isBrowser = () => {
  return !isNode()
}
