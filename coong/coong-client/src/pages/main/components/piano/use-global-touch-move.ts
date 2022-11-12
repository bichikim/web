import {useEvent} from '@winter-love/use'
import {createOnce} from '@winter-love/utils'
import {effectScope, ref, Ref} from 'vue'

const scope = effectScope()

let touchmove: Ref<TouchList>

const initEvent = createOnce(() => {
  touchmove = scope.run(() => {
    const touchmove = ref(null)

    const update = (event: TouchEvent) => {
      touchmove.value = event.changedTouches
    }

    useEvent(window, 'touchmove', update)

    return touchmove
  })
})

export const useGlobalTouchMove = () => {
  initEvent()
  return computed(() => touchmove.value)
}
