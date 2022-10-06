import {getOutside, getPosition} from '@winter-love/utils'
import {resolveRef} from 'src/resolve-ref'
import {defaultRef} from 'src/default-ref'
import {MaybeRef} from 'src/types'
import {useSizeRef} from 'src/use-size-ref'
import {computed, ComputedRef, toRef} from 'vue'
import {UseStickyRelativePosition} from './types'

export type UseStickyPosition = 'bottom' | 'top' | 'right' | 'left'

export interface UseStickyResult {
  side: UseStickyPosition
  x: number
  y: number
}

export interface UseStickyOptions {
  container?: HTMLElement | Window
  defaultPosition?: UseStickyPosition
  xPosition?: UseStickyRelativePosition
  yPosition?: UseStickyRelativePosition
}

export const useSticky = (
  element: MaybeRef<HTMLElement>,
  target?: MaybeRef<HTMLElement | Window | undefined>,
  options: UseStickyOptions = {},
): ComputedRef<UseStickyResult> => {
  const container = toRef(options, 'container', window)
  const defaultPosition = toRef(options, 'defaultPosition', 'bottom')
  const targetRef = resolveRef(target)
  const hasTargetRef = computed(() => {
    return Boolean(targetRef.value)
  })
  const targetSizeRef = useSizeRef(
    defaultRef(targetRef, () => window),
    container,
  )
  const elementSizeRef = useSizeRef(element, container, true, targetSizeRef)
  const containerSizeRef = useSizeRef(container, container)
  const defaultPositionRef = resolveRef(defaultPosition)
  const xPositionRef = toRef(options, 'xPosition', 'start')
  const yPositionRef = toRef(options, 'yPosition', 'start')

  const mergedSizeRef = computed(() => {
    const elementSize = elementSizeRef.value
    const targetSize = targetSizeRef.value
    const defaultPosition = defaultPositionRef.value
    switch (defaultPosition) {
      case 'bottom':
        return {
          height: elementSize.height + targetSize.height,
          width: elementSize.width,
          x: targetSize.x,
          y: targetSize.y,
        }
      case 'top':
        return {
          height: elementSize.height + targetSize.height,
          width: elementSize.width,
          x: targetSize.x,
          y: targetSize.y - elementSize.height,
        }
      case 'left':
        return {
          height: elementSize.height,
          width: elementSize.width + targetSize.width,
          x: targetSize.x - elementSize.width,
          y: targetSize.y,
        }
      case 'right':
        return {
          height: elementSize.height,
          width: elementSize.width + targetSize.width,
          x: targetSize.x,
          y: targetSize.y,
        }
      default:
        return {
          height: targetSize.height,
          width: targetSize.width,
          x: targetSize.x,
          y: targetSize.y,
        }
    }
  })

  const outsidePositionRef = computed(() => getOutside(mergedSizeRef.value, containerSizeRef.value))

  const sideRef = computed(() => {
    const {x, y} = outsidePositionRef.value
    if (x > 0) {
      return 'left'
    }
    if (x < 0) {
      return 'right'
    }
    if (y > 0) {
      return 'top'
    }
    if (y < 0) {
      return 'bottom'
    }
    return defaultPositionRef.value
  })

  return computed(() => {
    const elementSize = elementSizeRef.value
    const side = sideRef.value
    const targetSize = targetSizeRef.value
    const xPosition = xPositionRef.value
    const yPosition = yPositionRef.value
    const horizontalSize = getPosition(xPosition, targetSize, elementSize)
    const verticalSize = getPosition(yPosition, targetSize, elementSize)

    if (!hasTargetRef.value) {
      return {
        side,
        x: horizontalSize.x,
        y: verticalSize.y,
      }
    }

    switch (side) {
      case 'bottom':
        return {
          side,
          x: horizontalSize.x,
          y: targetSize.y + targetSize.height,
        }
      case 'top':
        return {
          side,
          x: horizontalSize.x,
          y: targetSize.y - elementSize.height,
        }
      case 'right':
        return {
          side,
          x: targetSize.width + targetSize.x,
          y: verticalSize.y,
        }
      case 'left':
        return {
          side,
          x: targetSize.x - elementSize.width,
          y: verticalSize.y,
        }
      default:
        return {
          side,
          x: targetSize.x,
          y: targetSize.y,
        }
    }
  })
}
