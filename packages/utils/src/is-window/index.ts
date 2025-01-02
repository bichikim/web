import {getWindow} from 'src/get-window'
import {isUndefined} from 'src/is-undefined'

export const isWindow = (value: any): value is Window => {
  const window = getWindow()

  if (isUndefined(window)) {
    return false
  }

  return window === value
}
