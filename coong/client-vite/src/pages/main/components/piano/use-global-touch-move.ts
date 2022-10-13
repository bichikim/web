import {useEvent} from '@winter-love/use'
import {createOnce} from '@winter-love/utils'
import {effectScope, ref, Ref} from 'vue'

const scope = effectScope()

let touchmove: Ref<Touch | null>

const initEvent = createOnce(() => {
  touchmove = scope.run(() => {
    const touchmove = ref(null)
    useEvent(window, 'touchmove', (event: TouchEvent) => {
      // eslint-disable-next-line prefer-destructuring
      touchmove.value = event.changedTouches[0]
    })

    return touchmove
  })
})

export const useGlobalTouchMove = () => {
  initEvent()
  return computed(() => touchmove.value)
}
