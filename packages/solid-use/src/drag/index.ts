import {createSignal} from 'solid-js'
import {MaybeAccessor} from 'src/types'
import {useEvent} from 'src/event'
import {getWindow} from '@winter-love/utils'
import {toggleValue} from 'src/toggle-value'

interface StartPoints {
  point: [number, number]
  relativePoint: [number, number]
}

export type DragType = 'start' | 'move' | 'end'

interface DragPayload {
  /**
   * drag position
   */
  currentPoint: [number, number]
  /**
   * handleElement pressed position
   */
  relativePoint: [number, number]
  /**
   * where it originated on the screen
   */
  startPoint: [number, number]
}

export const useDrag = (
  handleElement: MaybeAccessor<HTMLElement | null>,
  callback: (type: DragType, payload: DragPayload) => void,
) => {
  const [startPoints, setStartPoints] = createSignal<StartPoints>({
    point: [0, 0],
    relativePoint: [0, 0],
  })
  const [pointDown, setPointDown] = createSignal(false)

  let currentPoint: [number, number] = [0, 0]

  useEvent(handleElement, 'pointerdown', (event) => {
    const points: StartPoints = {
      point: [event.clientX, event.clientY],
      relativePoint: [event.offsetX, event.offsetY],
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
    const {point, relativePoint} = startPoints()

    currentPoint = [x, y]

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
