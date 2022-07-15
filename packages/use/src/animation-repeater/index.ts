import {ref, watch} from 'vue-demi'
import {wrapRef} from '../wrap-ref'
import {MayRef} from 'src/types'
import {getWindow} from '@winter-love/utils'

export type UseAnimationTickHandle = () => any

/**
 * @deprecated please use onAnimationRepeater
 * @param handle
 * @param toggle
 */
export const animationRepeater = (
  handle: UseAnimationTickHandle,
  toggle?: MayRef<boolean | undefined>,
) => {
  const toggleRef = wrapRef(toggle, {defaultValue: true})
  const cancelFlagRef = ref<number | undefined>()
  const window = getWindow()

  const tick = () => {
    if (window && toggleRef.value) {
      handle()
      window.requestAnimationFrame(tick)
    }
  }

  const registerTick = (value: boolean) => {
    if (!window) {
      return
    }

    const {requestAnimationFrame, cancelAnimationFrame} = window

    if (value) {
      cancelFlagRef.value = requestAnimationFrame(tick)
      return
    }

    if (cancelFlagRef.value) {
      cancelAnimationFrame(cancelFlagRef.value)
    }
  }

  watch(toggleRef, registerTick)

  if (toggleRef.value) {
    registerTick(true)
  }

  return toggleRef
}

export const onAnimationRepeater = animationRepeater
