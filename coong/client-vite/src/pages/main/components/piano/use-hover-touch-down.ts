import {MaybeRef, resolveRef, useEvent} from '@winter-love/use'
import {ref, watch} from 'vue'
import {useGlobalTouchMove} from './use-global-touch-move'

export const useHoverTouchDown = (element: MaybeRef<HTMLElement>, isActive: MaybeRef<boolean>) => {
  const isActiveRef = resolveRef(isActive)
  const elementRef = resolveRef(element)
  const isInsideRef = ref(false)
  const touchMove = useGlobalTouchMove()
  const identifier = ref(-1)

  const updateInside = (
    touches: TouchList,
    value: boolean,
    validate: (touch: Touch) => boolean,
  ) => {
    // TouchList 는 list 가 아니다
    // eslint-disable-next-line unicorn/no-for-loop
    for (let index = 0; index < touches.length; index += 1) {
      const touch = touches[index]
      const isInside = document.elementFromPoint(touch.clientX, touch.clientY) === elementRef.value
      if (isInside && validate(touch)) {
        isInsideRef.value = isInside && value
        identifier.value = touch.identifier
      }
    }
  }

  useEvent(elementRef, 'touchstart', (event: TouchEvent) => {
    const touches = event.changedTouches
    // eslint-disable-next-line unicorn/no-for-loop
    for (let index = 0; index < touches.length; index += 1) {
      const touch = touches[index]
      isInsideRef.value =
        document.elementFromPoint(touch.clientX, touch.clientY) === elementRef.value
      identifier.value = touch.identifier
    }
  })

  useEvent(window, 'touchend', (event: TouchEvent) => {
    const touches = event.changedTouches
    // eslint-disable-next-line unicorn/no-for-loop
    for (let index = 0; index < touches.length; index += 1) {
      const touch = touches[index]
      const isInside = document.elementFromPoint(touch.clientX, touch.clientY) === elementRef.value
      if (isInside) {
        isInsideRef.value = false
        identifier.value = -1
      }
    }
  })

  watch(touchMove, (touches: TouchList) => {
    if (!isActiveRef.value) {
      return
    }

    // eslint-disable-next-line unicorn/no-for-loop
    for (let index = 0; index < touches.length; index += 1) {
      const touch = touches[index]
      const isInside = document.elementFromPoint(touch.clientX, touch.clientY) === elementRef.value

      if (isInside) {
        isInsideRef.value = true
        identifier.value = touch.identifier
      } else if (identifier.value === touch.identifier) {
        isInsideRef.value = false
        identifier.value = -1
      }
      if (isInside) {
        // no more check
        return
      }
    }
  })

  return isInsideRef
}
