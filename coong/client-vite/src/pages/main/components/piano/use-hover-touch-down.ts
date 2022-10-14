import {createOnce, getElementSize, Position, Rect} from '@winter-love/utils'
import {effectScope, Ref, ref, watch} from 'vue'
import {MaybeRef, resolveRef, useEvent} from '@winter-love/use'
import {useGlobalTouchMove} from './use-global-touch-move'

const isInside = (rect: Rect, position: Position) => {
  return (
    position.x >= rect.x &&
    position.x < rect.x + rect.width &&
    position.y >= rect.y &&
    position.y < rect.y + rect.height
  )
}

export const useHoverTouchDown = (
  element: MaybeRef<HTMLElement>,
  isActive: MaybeRef<boolean>,
  extract?: MaybeRef<HTMLElement | string>,
) => {
  const isActiveRef = resolveRef(isActive)
  const elementRef = resolveRef(element)
  const isInsideRef = ref(false)
  const touchMove = useGlobalTouchMove()

  useEvent(elementRef, 'touchstart', (event: TouchEvent) => {
    // eslint-disable-next-line prefer-destructuring
    const touch = event.changedTouches[0]
    isInsideRef.value = isInside(getElementSize(elementRef.value), {
      x: touch.clientX,
      y: touch.clientY,
    })
  })

  useEvent(elementRef, 'touchend', () => {
    isInsideRef.value = false
  })

  watch(touchMove, (touch: Touch) => {
    if (!isActiveRef.value) {
      return
    }
    isInsideRef.value = isInside(getElementSize(elementRef.value), {
      x: touch.clientX,
      y: touch.clientY,
    })
  })

  return isInsideRef
}
