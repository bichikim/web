import {ref, watch} from 'vue-demi'
import {wrapRef} from '../wrap-ref'
import {MayRef} from 'src/types'
import {isSSR} from '@winter-love/utils'

export type UseAnimationTickHandle = () => any

export const animationRepeater = (handle: UseAnimationTickHandle, toggle?: MayRef<boolean | undefined>) => {
  const toggleRef = wrapRef(toggle, {initState: true})
  const cancelFlagRef = ref<number | undefined>()

  const tick = () => {
    if (toggleRef.value) {
      handle()
      window.requestAnimationFrame(tick)
    }
  }

  const registerTick = (value: boolean) => {
    if (isSSR()) {
      return
    }
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

export const onAnimationRepeater = animationRepeater
