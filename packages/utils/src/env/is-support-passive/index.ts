import {once} from 'src/factory/once'

export const isSupportPassive = once(() => {
  let supportsPassive = false
  try {
    // testing passive supporting does not require type
    ;(window.addEventListener as any)(
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
