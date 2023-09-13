import {getWindow} from 'src/dom/get-window'
import {isUndefined} from 'src/validate/is-undefined'
export const isWindow = (value: any): value is Window => {
  const window = getWindow()
  if (isUndefined(window)) {
    return false
  }
  return window === value
}
