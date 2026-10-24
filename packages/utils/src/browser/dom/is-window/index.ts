import {getWindow} from 'src/browser/dom/get-window'
import {isUndefined} from 'es-toolkit/predicate'

export const isWindow = (value: any): value is Window => {
  const window = getWindow()

  if (isUndefined(window)) {
    return false
  }

  return window === value
}
