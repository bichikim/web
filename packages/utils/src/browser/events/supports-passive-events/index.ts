import {once} from 'src/core/functions/once'

export const supportsPassiveEvents = once(() => {
  let supportsPassive = false

  try {
    // testing passive supporting does not require type
    // eslint-disable-next-line format/padding-line-between-statements
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

/** @deprecated Use `supportsPassiveEvents` instead. */
export const isSupportPassive = supportsPassiveEvents
