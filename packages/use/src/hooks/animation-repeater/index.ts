import {getWindow} from '@winter-love/utils'
import {ref, Ref, watch} from 'vue'
import {defaultRef} from 'src/refs/default-ref'
import {mutRef} from 'src/refs/mut-ref'
import {resolveRef} from 'src/refs/resolve-ref'
import {MaybeRef} from 'src/types'

export type UseAnimationTickHandle = () => any

/**
 * @param handle
 * @param toggle
 */
export const onAnimationRepeater = (
  handle: UseAnimationTickHandle,
  toggle?: MaybeRef<boolean | undefined>,
) => {
  const toggleRef: Ref<boolean> = mutRef(defaultRef(resolveRef(toggle), () => true))
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
