import {debounce} from 'debounce'
import {computed, onBeforeUnmount} from 'vue-demi'
import {wrapRef} from 'src/wrap-ref'
import {MayRef} from 'src/types'

export type UseDebounceHandle<Args extends any[]> = (...args: Args) => unknown

const defaultWait = 150

export const useDebounce = <Args extends any[]>(
  handle?: UseDebounceHandle<Args>,
  wait: MayRef<number | boolean> = defaultWait,
  immediate: MayRef<boolean> = false,
) => {
  const onHandle = (...args: Args) => {
    return handle?.(...args)
  }

  const waitRef = wrapRef(wait)
  const immediateRef = wrapRef(immediate)

  const onCall = computed(() => {
    const wait = waitRef.value
    if (wait) {
      const _wait = typeof wait === 'number' ? wait : defaultWait
      return debounce(onHandle, _wait, immediateRef.value)
    }
    return Object.assign(onHandle, {
      clear() {
        // empty
      },
    })
  })

  onBeforeUnmount(() => {
    onCall.value?.clear()
  })

  return (...args: Args) => {
    onCall.value(...args)
  }
}
