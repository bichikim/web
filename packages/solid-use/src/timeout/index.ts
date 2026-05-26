import {MaybeAccessor} from 'src/types'
import {resolveAccessor} from 'src/resolve-accessor'
import {onCleanup} from 'solid-js'

export const createTimeout = <T extends (...args: any) => any>(
  callback: T,
  timeoutMs: MaybeAccessor<number>,
) => {
  const timeoutMsAccessor = resolveAccessor(timeoutMs)
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  let waitCallback: (() => void) | null = null

  const cancel = () => {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId)
      timeoutId = undefined
    }
    waitCallback = null
  }

  onCleanup(() => {
    cancel()
  })

  return {
    cancel,
    execute: (...args: Parameters<T>) => {
      cancel()
      waitCallback = () => {
        waitCallback = null
        return callback(...args)
      }
      timeoutId = setTimeout(waitCallback, timeoutMsAccessor())
    },
    flush: () => {
      if (timeoutId === undefined) {
        return
      }
      clearTimeout(timeoutId)
      timeoutId = undefined
      waitCallback?.()
      waitCallback = null
    },
  }
}

export const useTimeout = createTimeout
