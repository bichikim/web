import {useEvent} from '@winter-love/use'
import {createOnce} from '@winter-love/utils'
import {DeepReadonly, effectScope, readonly, ref, Ref} from 'vue'

const scope = effectScope()

export const useGlobalTouchMove = createOnce(() => {
  return scope.run((): DeepReadonly<Ref<null | TouchList>> => {
    const touchmove = ref(null)

    const update = (event: TouchEvent) => {
      touchmove.value = event.changedTouches
    }

    useEvent(window, 'touchmove', update, true, {
      passive: false,
    })

    return readonly(touchmove)
  })
})
