import {debounce} from 'debounce'
import {computed, onBeforeUnmount} from 'vue-demi'
import {wrapRef} from 'src/wrap-ref'
import {MayRef} from 'src/types'

export type UseDebounceHandle<Args extends any[]> = (...args: Args) => unknown

const defaultWait = 150

export const useDebounce = <Args extends any[]>(
  handle?: UseDebounceHandle<Args>,
  wait: MayRef<number> = defaultWait,
  immediate: boolean = false,
) => {
  const waitRef = wrapRef(wait)
  const onCall = computed(() => {
    return debounce((...args: Args) => handle?.(...args), waitRef.value, immediate)
  })

  onBeforeUnmount(() => {
    onCall.value.clear()
  })

  return (...args: Args) => {
    onCall.value(...args)
  }
}
