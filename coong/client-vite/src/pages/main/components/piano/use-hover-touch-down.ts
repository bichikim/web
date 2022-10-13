import {createOnce, getElementSize, Position, Rect} from '@winter-love/utils'
import {effectScope, Ref, ref, watch} from 'vue'
import {useEvent} from '@winter-love/use'
import {useGlobalTouchMove} from './use-global-touch-move'

const isInside = (rect: Rect, position: Position) => {
  return (
    position.x >= rect.x &&
    position.x < rect.x + rect.width &&
    position.y >= rect.y &&
    position.y < rect.y + rect.height
  )
}

export const useHoverTouchDown = (element: Ref<HTMLElement>, isActive: Ref<boolean>) => {
  const isInsideRef = ref(false)
  const touchMove = useGlobalTouchMove()

  useEvent(element, 'touchstart', (event: TouchEvent) => {
    // eslint-disable-next-line prefer-destructuring
    const touch = event.changedTouches[0]
    isInsideRef.value = isInside(getElementSize(element.value), {
      x: touch.clientX,
      y: touch.clientY,
    })
  })

  useEvent(element, 'touchend', (event: TouchEvent) => {
    isInsideRef.value = false
  })

  watch(touchMove, (touch: Touch) => {
    if (!isActive.value) {
      return
    }
    isInsideRef.value = isInside(getElementSize(element.value), {
      x: touch.clientX,
      y: touch.clientY,
    })
  })

  return isInsideRef
}
