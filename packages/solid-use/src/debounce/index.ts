import {debounce} from 'es-toolkit/compat'
import {MaybeAccessor} from 'src/types'
import {resolveAccessor} from 'src/resolve-accessor'
import {createEffect, onCleanup} from 'solid-js'

export type DebounceSettings = NonNullable<Parameters<typeof debounce>[2]>
export type DebouncedFunc<T extends (...args: any) => any> = ReturnType<typeof debounce<T>>

export const createDebounce = <T extends (...args: any) => any>(
  callback: T,
  debounceMs: MaybeAccessor<number>,
  options: MaybeAccessor<DebounceSettings> = {},
) => {
  const debounceMsAccessor = resolveAccessor(debounceMs)
  const optionsAccessor = resolveAccessor(options)
  let debounceInstance: DebouncedFunc<T> | null = null
  let shouldExecute: Parameters<T> | null = null

  createEffect(() => {
    const ms = debounceMsAccessor()
    const options = optionsAccessor()
    debounceInstance = debounce(callback, ms, options)

    if (shouldExecute) {
      debounceInstance(...shouldExecute)
      shouldExecute = null
    }

    onCleanup(() => {
      debounceInstance?.cancel()
      debounceInstance = null
    })
  })

  onCleanup(() => {
    shouldExecute = null
  })

  return {
    cancel: () => {
      shouldExecute = null
      debounceInstance?.cancel()
    },
    execute: (...args: Parameters<T>) => {
      // 최초 createEffect 전에 여러번 execute 될 경우 마지막 execute 만 실행됩니다
      if (!debounceInstance) {
        shouldExecute = args
        return
      }
      debounceInstance(...args)
    },
    flush: () => {
      debounceInstance?.flush()
    },
  }
}

export const useDebounce = createDebounce
