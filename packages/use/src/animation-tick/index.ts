import {ref, watch} from 'vue'
import {wrapRef} from '../wrap-ref'
import {MayRef} from 'src/types'

export type UseAnimationTickHook = () => any

export const useAnimationTick = (hook: UseAnimationTickHook, toggle?: MayRef<boolean | undefined>) => {
  const toggleRef = wrapRef(toggle, {initState: true})
  const cancelFlagRef = ref<number | undefined>()

  const tick = () => {
    if (toggleRef.value) {
      hook()
      window.requestAnimationFrame(tick)
    }
  }

  const registerTick = (value: boolean) => {

    if (value) {
      cancelFlagRef.value = window.requestAnimationFrame(tick)
      return
    }
    if (cancelFlagRef.value) {
      window.cancelAnimationFrame(cancelFlagRef.value)
    }
  }

  watch(toggleRef, registerTick)

  if (toggleRef.value) {
    registerTick(true)
  }

  return toggleRef
}
