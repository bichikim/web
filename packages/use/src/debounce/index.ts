import {debounce} from 'debounce'
import {computed, onBeforeUnmount} from 'vue-demi'
import {wrapRef} from 'src/wrap-ref'
import {MayRef} from 'src/types'

export type UseDebounceHandle = () => unknown

const defaultWait = 150

export const useDebounce = (
  handle?: UseDebounceHandle,
  wait: MayRef<number> = defaultWait,
  immediate: boolean = false,
) => {
  const waitRef = wrapRef(wait)
  const onCall = computed(() => {
    return debounce(() => handle?.(), waitRef.value, immediate)
  })

  onBeforeUnmount(() => {
    onCall.value.clear()
  })

  return () => {
    onCall.value()
  }
}
