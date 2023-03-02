import {once} from 'src/function/once'

export const isSupportPassive = once(() => {
  let supportsPassive = false
  try {
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
