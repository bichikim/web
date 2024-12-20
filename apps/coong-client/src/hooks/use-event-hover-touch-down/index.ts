import {MaybeRef, onEvent, resolveRef} from '@winter-love/use'
import {once} from '@winter-love/utils'
import {effectScope, Ref, ref, shallowRef, watch} from 'vue'
import {createGlobalEvent} from '../create-global-event'
import {elementFromPoint} from './element-from-point'

const useShardEnd = once(() => {
  const scope = effectScope()
  return scope.run((): Ref<null | TouchList> => {
    return shallowRef(null)
  }) as Ref<null | TouchList>
})

export const useGlobalTouchMove = createGlobalEvent(
  'touchmove',
  (event: TouchEvent) => event.targetTouches,
)

export const useEventHoverTouchDown = (element: MaybeRef<HTMLElement | null>) => {
  const elementRef = resolveRef(element)
  const isInsideRef = ref(false)
  const touchMove = useGlobalTouchMove()
  const shardEnd = useShardEnd()
  const identifier = ref(-1)

  onEvent(
    elementRef,
    'touchstart',
    (event: TouchEvent) => {
      if (event.cancelable) {
        event.preventDefault()
      }

      const touches = event.changedTouches
      // eslint-disable-next-line unicorn/no-for-loop
      for (let index = 0; index < touches.length; index += 1) {
        const touch = touches[index]
        const isInside =
          elementFromPoint(touch.clientX, touch.clientY) === elementRef.value
        if (isInside) {
          isInsideRef.value = true
          identifier.value = touch.identifier
          return
        }
      }
    },
    {
      passive: false,
    },
  )

  watch(shardEnd, (touches) => {
    if (!touches) {
      return
    }
    // eslint-disable-next-line unicorn/no-for-loop
    for (let index = 0; index < touches.length; index += 1) {
      const touch = touches[index]
      if (
        identifier.value === touch.identifier &&
        elementFromPoint(touch.clientX, touch.clientY) === elementRef.value
      ) {
        isInsideRef.value = false
        identifier.value = -1
        return
      }
    }
  })

  onEvent(
    elementRef,
    'touchend',
    (event: TouchEvent) => {
      // update shardEnd
      shardEnd.value = event.changedTouches
    },
    {
      passive: false,
    },
  )

  watch(touchMove, (touches: TouchList | null) => {
    if (!touches) {
      return
    }
    const maxLength = touches.length
    for (let index = 0; index < maxLength; index += 1) {
      const touch = touches[index]
      const isInside = elementFromPoint(touch.clientX, touch.clientY) === elementRef.value

      if (isInside) {
        isInsideRef.value = true
        identifier.value = touch.identifier
        return
      }
      if (identifier.value === touch.identifier) {
        isInsideRef.value = false
        identifier.value = -1
        return
      }
    }
  })

  return isInsideRef
}
