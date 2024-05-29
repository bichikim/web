import {SERVER_RENDERED_KEY} from './keys'
import {isSsr} from './is-ssr'
export const isServerRendered = () => {
  if (__DEV__) {
    // tree-shack
    // eslint-disable-next-line unicorn/no-lonely-if
    if (isSsr()) {
      console.warn('Do not use isServerRendered in SSR')
    }
  }
  const body = document.querySelector('body')
  if (!body) {
    return false
  }
  return body.hasAttribute(SERVER_RENDERED_KEY)
}
