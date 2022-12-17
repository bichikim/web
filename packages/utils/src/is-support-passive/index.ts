import {once} from '../once'

export const isSupportPassive = once(() => {
  let supportsPassive = false
  try {
    window.addEventListener(
      'test',
      null,
      Object.defineProperty({}, 'passive', {
        get: function () {
          supportsPassive = true
          return true
        },
      }),
    )
  } catch {
    // skip
  }

  return supportsPassive
})
