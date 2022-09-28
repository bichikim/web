import {ref, watch} from 'vue'
import {resolveRef} from '../resolve-ref'
import {bindRef} from '../bind-ref'
import {defaultRef} from 'src/default-ref'
import {MaybeRef} from 'src/types'
import {getWindow} from '@winter-love/utils'

export type UseAnimationTickHandle = () => any

/**
 * @param handle
 * @param toggle
 */
export const onAnimationRepeater = (
  handle: UseAnimationTickHandle,
  toggle?: MaybeRef<boolean | undefined>,
) => {
  const toggleRef = bindRef(defaultRef(resolveRef(toggle), () => true))
  const cancelFlagRef = ref<number | undefined>()
  const window = getWindow()

  const tick = () => {
    if (window && toggleRef.value) {
      handle()
      cancelFlagRef.value = window?.requestAnimationFrame(tick)
    }
  }

  const registerTick = (value: boolean) => {
    if (!window) {
      return
    }

    if (value) {
      cancelFlagRef.value = window?.requestAnimationFrame(tick)
      return
    }

    console.log(cancelFlagRef.value)
    if (cancelFlagRef.value) {
      window?.cancelAnimationFrame(cancelFlagRef.value)
    }
  }

  watch(toggleRef, registerTick)

  if (toggleRef.value) {
    registerTick(true)
  }

  return toggleRef
}
