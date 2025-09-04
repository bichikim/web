import {createSignal} from 'solid-js'
import {MaybeAccessor} from 'src/types'
import {useEvent} from 'src/event'
import {getWindow} from '@winter-love/utils'
import {toggleValue} from 'src/toggle-value'
import {resolveAccessor} from 'src/resolve-accessor'

interface StartPoints {
  parentPosition: {x: number; y: number}
  point: {x: number; y: number}
  relativePoint: {x: number; y: number}
}

export type DragType = 'start' | 'move' | 'end'

export interface DragPayload {
  /**
   * drag position
   */
  currentPoint: {x: number; y: number}
  /**
   * handleElement pressed position
   */
  relativePoint: {x: number; y: number}
  /**
   * where it originated on the screen
   */
  startPoint: {x: number; y: number}
}

/**
 * @experimental
 */
export const useDrag = (
  handleElement: MaybeAccessor<HTMLElement | null>,
  callback: (type: DragType, payload: DragPayload) => void,
  parentElement?: MaybeAccessor<HTMLElement | null | undefined>,
) => {
  const parentElementAccessor = resolveAccessor(parentElement)

  const [startPoints, setStartPoints] = createSignal<StartPoints>({
    parentPosition: {x: 0, y: 0},
    point: {x: 0, y: 0},
    relativePoint: {x: 0, y: 0},
  })
  const [pointDown, setPointDown] = createSignal(false)

  let currentPoint: {x: number; y: number} = {x: 0, y: 0}

  useEvent(handleElement, 'pointerdown', (event) => {
    const parentPosition = parentElementAccessor()?.getBoundingClientRect() ?? {x: 0, y: 0}

    const points: StartPoints = {
      parentPosition,
      point: {x: event.clientX - parentPosition.x, y: event.clientY - parentPosition.y},
      relativePoint: {x: event.offsetX, y: event.offsetY},
    }

    setStartPoints(points)
    setPointDown(true)

    callback('start', {
      currentPoint: points.point,
      relativePoint: points.relativePoint,
      startPoint: points.point,
    })
  })

  const onMoveEnd = () => {
    const {point, relativePoint} = startPoints()

    setPointDown(false)

    callback('end', {
      currentPoint,
      relativePoint,
      startPoint: point,
    })
  }

  useEvent(toggleValue(getWindow, pointDown, null), 'mouseup', onMoveEnd)
  useEvent(toggleValue(getWindow, pointDown, null), 'touchend', onMoveEnd)

  const onMove = (x: number, y: number) => {
    const {point, relativePoint, parentPosition} = startPoints()

    currentPoint = {x: x - parentPosition.x, y: y - parentPosition.y}

    callback('move', {
      currentPoint,
      relativePoint,
      startPoint: point,
    })
  }

  useEvent(toggleValue(getWindow, pointDown, null), 'touchmove', (event) => {
    const [firstPoint] = event.changedTouches

    onMove(firstPoint.clientX, firstPoint.clientY)
  })

  useEvent(toggleValue(getWindow, pointDown, null), 'pointermove', (event) => {
    onMove(event.clientX, event.clientY)
  })
}
