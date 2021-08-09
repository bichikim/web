import {isSSR} from '../is-ssr'

export const getWindow = (): undefined | Window => {
  if (isSSR()) {
    return
  }
  return window
}
