import {debounce} from 'debounce'
import {computed, onBeforeUnmount} from 'vue-demi'
import {wrapRef} from 'src/wrap-ref'
import {MayRef} from 'src/types'

export type UseDebounceHandle<Args extends any[]> = (...args: Args) => unknown

const defaultWait = 150

export const useDebounce = <Args extends any[]>(
  handle?: UseDebounceHandle<Args>,
  wait: MayRef<number | boolean> = defaultWait,
  immediate: boolean = false,
) => {
  const onHandle = (...args: Args) => {
    return handle?.(...args)
  }

  const waitRef = wrapRef(wait)

  const numberWaitRef = computed(() => {
    const wait = waitRef.value
    if (typeof wait === 'number') {
      return wait
    }
    return defaultWait
  })

  const onCall = computed(() => {
    return debounce(onHandle, numberWaitRef.value, immediate)
  })

  onBeforeUnmount(() => {
    onCall.value.clear()
  })

  return (...args: Args) => {
    if (!waitRef.value) {
      onHandle(...args)
    }
    onCall.value(...args)
  }
}
