import {getWindow, Position, Rect} from '@winter-love/utils'
import {getPosition} from './get-position'
import {getOutside} from './get-outside'
import {resolveRef} from 'src/refs/resolve-ref'
import {defaultRef} from 'src/refs/default-ref'
import {MaybeRef} from 'src/types'
import {useSize} from 'src/hooks/size'
import {computed, ComputedRef, reactive, toRef} from 'vue'
import {UseStickyRelativePosition} from './types'

export * from './types'
export type UseStickyPosition = 'bottom' | 'top' | 'right' | 'left'

export interface UseStickyResult {
  height: number
  side: UseStickyPosition
  width: number
  x: number
  y: number
}

export interface UseStickyOptions {
  container?: HTMLElement | Window
  defaultPosition?: UseStickyPosition
  xPosition?: UseStickyRelativePosition
  yPosition?: UseStickyRelativePosition
}

const mergeSize = (elementSize: Rect, targetSize: Rect, position: UseStickyPosition) => {
  switch (position) {
    case 'bottom': {
      return {
        height: elementSize.height + targetSize.height,
        width: elementSize.width,
        x: targetSize.x,
        y: targetSize.y,
      }
    }

    case 'top': {
      return {
        height: elementSize.height + targetSize.height,
        width: elementSize.width,
        x: targetSize.x,
        y: targetSize.y - elementSize.height,
      }
    }

    case 'left': {
      return {
        height: elementSize.height,
        width: elementSize.width + targetSize.width,
        x: targetSize.x - elementSize.width,
        y: targetSize.y,
      }
    }

    case 'right': {
      return {
        height: elementSize.height,
        width: elementSize.width + targetSize.width,
        x: targetSize.x,
        y: targetSize.y,
      }
    }

    default: {
      return {
        height: targetSize.height,
        width: targetSize.width,
        x: targetSize.x,
        y: targetSize.y,
      }
    }
  }
}

const getSide = (
  position: Position,
  defaultPosition: UseStickyPosition,
): UseStickyPosition => {
  const {x, y} = position

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

  return defaultPosition
}

export const useSticky = (
  element: MaybeRef<HTMLElement | null>,
  target?: MaybeRef<HTMLElement | Window | undefined>,
  options: UseStickyOptions = {},
): ComputedRef<UseStickyResult> => {
  const container = toRef(options, 'container', getWindow() as any)
  const defaultPosition = toRef(options, 'defaultPosition', 'bottom')
  const xPositionRef = toRef(options, 'xPosition', 'start')
  const yPositionRef = toRef(options, 'yPosition', 'start')
  const targetRef = resolveRef(target)
  const defaultPositionRef = resolveRef(defaultPosition)
  const hasTargetRef = computed(() => {
    return Boolean(targetRef.value)
  })
  const targetSizeRef = useSize(
    defaultRef(targetRef, () => globalThis),
    container,
  )
  const elementSizeRef = useSize(
    element,
    container,
    reactive({defaultSize: targetSizeRef, delay: 125}),
  )
  const containerSizeRef = useSize(container, container)
  const mergedSizeRef = computed(() =>
    mergeSize(elementSizeRef.value, targetSizeRef.value, defaultPositionRef.value),
  )
  const outsidePositionRef = computed(() =>
    getOutside(mergedSizeRef.value, containerSizeRef.value),
  )
  const sideRef = computed(() =>
    getSide(outsidePositionRef.value, defaultPositionRef.value),
  )

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
        height: targetSize.height,
        side,
        width: targetSize.width,
        x: horizontalSize.x,
        y: verticalSize.y,
      }
    }

    switch (side) {
      case 'bottom': {
        return {
          height: targetSize.height,
          side,
          width: targetSize.width,
          x: horizontalSize.x,
          y: targetSize.y + targetSize.height,
        }
      }

      case 'top': {
        return {
          height: targetSize.height,
          side,
          width: targetSize.width,
          x: horizontalSize.x,
          y: targetSize.y - elementSize.height,
        }
      }

      case 'right': {
        return {
          height: targetSize.height,
          side,
          width: targetSize.width,
          x: targetSize.width + targetSize.x,
          y: verticalSize.y,
        }
      }

      case 'left': {
        return {
          height: targetSize.height,
          side,
          width: targetSize.width,
          x: targetSize.x - elementSize.width,
          y: verticalSize.y,
        }
      }

      default: {
        return {
          height: targetSize.height,
          side,
          width: targetSize.width,
          x: targetSize.x,
          y: targetSize.y,
        }
      }
    }
  })
}

/**
 * useSticky 의 새 이름
 */
export const useElementSticky = useSticky
