import {useEvent} from '@winter-love/solid-use'
import {getDocument, getWindow, Position} from '@winter-love/utils'
import {Accessor, createSignal} from 'solid-js'

export const getElementsFromPoint = (position: Position): Element[] => {
  const document = getDocument()

  if (!document) {
    return []
  }

  return document.elementsFromPoint(position.x, position.y)
}

export const ELEMENT_IDENTIFIER_DATA_ATTR = 'global-touch__'

/**
 * 전역에서 감지해서 통보할 엘리먼트 인지 여부확인
 */
export const getGlobalTouch = (element: Element): string | null => {
  return element.getAttribute(`data-${ELEMENT_IDENTIFIER_DATA_ATTR}`)
}

const emitAllIDs = (downTouchIDs: Set<string>, value: boolean) => {
  const window = getWindow()
  if (!window) {
    return
  }
  for (const id of downTouchIDs) {
    const eventName = generateGlobalTouchEventName(id)
    window.dispatchEvent(new CustomEvent(eventName, {detail: value}))
  }
}

const generateGlobalTouchEventName = (id: string): string => {
  return `global-touch__${id}`
}

export const useGlobalTouch = (id: string): Accessor<boolean> => {
  const [isDown, setIsDown] = createSignal(false)
  const eventName = generateGlobalTouchEventName(id)

  useEvent(getWindow, eventName, ({detail: value}: CustomEvent<boolean>) => {
    setIsDown(value)
  })

  return isDown
}

const isString = (value: any): value is string => {
  return typeof value === 'string'
}

const getTouchedId = (touches: TouchList) => {
  const touchIDs: string[] = []
  const touchesLength = touches.length
  for (let index = 0; index < touchesLength; index += 1) {
    const touch = touches[index]
    const elements = getElementsFromPoint({x: touch.clientX, y: touch.clientY})
    const touchedElementIDs = elements
      .map((element) => getGlobalTouch(element))
      .filter((value) => isString(value))
    touchIDs.push(...touchedElementIDs)
  }
  return touchIDs
}

export const useGlobalTouchEmitter = () => {
  let downTouchIDs: Set<string> = new Set()

  useEvent(getWindow, 'touchstart', (event) => {
    const touches = event.changedTouches
    downTouchIDs = new Set(getTouchedId(touches))
    emitAllIDs(downTouchIDs, true)
  })

  useEvent(getWindow, 'touchmove', (event) => {
    const upTouchIds: Set<string> = new Set(downTouchIDs)
    const touches = event.changedTouches
    const touchIds = getTouchedId(touches)
    downTouchIDs = new Set(touchIds)
    const willUpdateTouchIds = new Set(touchIds)
    for (const id of downTouchIDs) {
      if (!upTouchIds.has(id)) {
        // the ids that downTouchIDs don't have
        upTouchIds.delete(id)
        // You don't have to give an event to change the down state back to the down state
        willUpdateTouchIds.delete(id)
      }
    }

    // update touchState
    emitAllIDs(upTouchIds, false)
    emitAllIDs(willUpdateTouchIds, true)
  })

  useEvent(getWindow, 'touchend', (event) => {
    // touchend 가 모든 손가락 터치가 끝난 것이 아닙니다
    const touches = event.changedTouches
    const touchIds = getTouchedId(touches)
    const upTouchIds = new Set(touchIds)

    for (const id of upTouchIds) {
      // down 된 목록에서 up 할 id 제거
      downTouchIDs.delete(id)
    }
    emitAllIDs(upTouchIds, false)
  })
}
