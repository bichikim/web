/* eslint-disable prefer-destructuring */
import {debounce, DebounceSettings} from '@winter-love/lodash'
import {resolveRef} from 'src/refs/resolve-ref'
import {MaybeRef, ReactiveOptions} from 'src/types'
import {reactive, ref, watchEffect} from 'vue'

export type UseDebounceOptions = DebounceSettings
export const useDebounce = <Args extends any[]>(
  delay: MaybeRef<number>,
  callback: (...args: Args) => void,
  options: ReactiveOptions<UseDebounceOptions> = {},
) => {
  const props = reactive(options)
  const delayRef = resolveRef(delay)

  const debouncedFunction = ref()

  watchEffect((onCleanup) => {
    const options: UseDebounceOptions = {}
    const leading = props.leading
    const maxWait = props.maxWait
    const trailing = props.trailing
    if (leading !== undefined) {
      options.leading = leading
    }
    if (maxWait !== undefined) {
      options.maxWait = maxWait
    }
    if (trailing !== undefined) {
      options.trailing = trailing
    }
    const _debouncedFunction = debounce(callback, delayRef.value, options)
    debouncedFunction.value = _debouncedFunction
    onCleanup(() => {
      _debouncedFunction.cancel()
    })
  })

  return (...args: Args) => {
    debouncedFunction.value?.(...args)
  }
}
