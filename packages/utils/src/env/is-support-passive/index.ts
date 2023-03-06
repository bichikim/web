import {once} from 'src/function/once'

export const isSupportPassive = once(() => {
  let supportsPassive = false
  try {
    // testing passive supporting does not require type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
