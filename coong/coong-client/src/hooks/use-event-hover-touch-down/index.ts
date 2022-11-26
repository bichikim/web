import {MaybeRef, resolveRef, useEvent} from '@winter-love/use'
import {ref, watch} from 'vue'
import {useGlobalTouchMove} from '../use-global-touch-move'
import {elementFromPoint} from './element-from-point'

export const useEventHoverTouchDown = (element: MaybeRef<HTMLElement>) => {
  const elementRef = resolveRef(element)
  const isInsideRef = ref(false)
  const touchMove = useGlobalTouchMove()
  const identifier = ref(-1)

  useEvent(
    elementRef,
    'touchstart',
    (event: TouchEvent) => {
      event.preventDefault()
      const touches = event.changedTouches
      // eslint-disable-next-line unicorn/no-for-loop
      for (let index = 0; index < touches.length; index += 1) {
        const touch = touches[index]
        const isInside = elementFromPoint(touch.clientX, touch.clientY) === elementRef.value
        if (isInside) {
          isInsideRef.value = true
          identifier.value = touch.identifier
          return
        }
      }
    },
    true,
    {
      passive: false,
    },
  )

  useEvent(
    window,
    'touchend',
    (event: TouchEvent) => {
      event.preventDefault()
      if (identifier.value < 0) {
        return
      }
      const touches = event.changedTouches
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
    },
    true,
    {
      passive: false,
    },
  )

  watch(touchMove, (touches: TouchList) => {
    // eslint-disable-next-line unicorn/no-for-loop
    for (let index = 0; index < touches.length; index += 1) {
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
