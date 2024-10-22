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

export const ELEMENT_IDENTIFIER_DATA_ATTR_NAME = 'global-touch__'
export const ELEMENT_IDENTIFIER_DATA_ATTR = `data-${ELEMENT_IDENTIFIER_DATA_ATTR_NAME}`

/**
 * 전역에서 감지해서 통보할 엘리먼트 인지 여부확인
 */
export const getGlobalTouch = (element: Element): string | null => {
  return element.getAttribute(ELEMENT_IDENTIFIER_DATA_ATTR)
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

export const findTouchFirstId = (elements: Element[]) => {
  for (const element of elements) {
    const id = getGlobalTouch(element)
    if (isString(id)) {
      return [id]
    }
  }
  return []
}

export const findTouchIds = (elements: Element[]) => {
  const ids: string[] = []
  for (const element of elements) {
    const id = getGlobalTouch(element)
    if (isString(id)) {
      ids.push(id)
    }
  }
  return ids
}

const getPointedIds = (position: Position, takeFirst: boolean = false) => {
  const elements = getElementsFromPoint(position)
  return takeFirst ? findTouchFirstId(elements) : findTouchIds(elements)
}

const getTouchedIds = (touches: TouchList, takeFirst: boolean = false) => {
  const touchIDs: string[] = []
  const touchesLength = touches.length
  for (let index = 0; index < touchesLength; index += 1) {
    const touch = touches[index]
    const elements = getElementsFromPoint({x: touch.clientX, y: touch.clientY})
    const touchedElementIDs = takeFirst
      ? findTouchFirstId(elements)
      : findTouchIds(elements)
    touchIDs.push(...touchedElementIDs)
  }
  return touchIDs
}

export interface UseGlobalTouchEmitterOptions {
  // prevent browser touch default action
  preventTouchContext?: boolean
  // Apply only the top-level element
  topLevelElementOnly?: boolean
}

export const useGlobalTouchEmitter = (options: UseGlobalTouchEmitterOptions = {}) => {
  let downIDs: Set<string> = new Set()
  const {topLevelElementOnly: takeFirst = false, preventTouchContext} = options

  if (preventTouchContext) {
    useEvent(getWindow, 'contextmenu', (event: any) => {
      if (event.pointerType === 'touch') {
        event.preventDefault()
      }
    })
  }

  useEvent(getWindow, 'pointerdown', (event: PointerEvent) => {
    // skip touch down
    if (event.pointerType === 'touch') {
      return
    }
    downIDs = new Set(getPointedIds({x: event.clientX, y: event.clientY}, takeFirst))
    emitAllIDs(downIDs, true)
  })

  useEvent(getWindow, 'pointerup', (event: PointerEvent) => {
    // skip touch down
    if (event.pointerType === 'touch') {
      return
    }
    //
    emitAllIDs(downIDs, false)
    downIDs = new Set()
    // console.log('pointerup', event.pointerType)
  })

  useEvent(getWindow, 'pointermove', (event: PointerEvent) => {
    // skip touch down
    if (event.pointerType === 'touch' || downIDs.size === 0) {
      return
    }
    const upTouchIds: Set<string> = new Set(downIDs)
    downIDs = new Set(getPointedIds({x: event.clientX, y: event.clientY}, takeFirst))
    const downTouchIds = new Set(downIDs)

    for (const id of downIDs) {
      if (upTouchIds.has(id)) {
        upTouchIds.delete(id)
      }
    }

    emitAllIDs(downTouchIds, true)
    emitAllIDs(upTouchIds, false)
    // console.log(downIDs)
    // console.log('pointermove', event.pointerType)
  })

  useEvent(getWindow, 'touchstart', (event) => {
    const touches = event.changedTouches
    downIDs = new Set(getTouchedIds(touches, takeFirst))
    emitAllIDs(downIDs, true)
  })

  useEvent(getWindow, 'touchmove', (event) => {
    const upTouchIds: Set<string> = new Set(downIDs)
    const touches = event.changedTouches
    downIDs = new Set(getTouchedIds(touches, takeFirst))
    const downTouchIds = new Set(downIDs)
    for (const id of downIDs) {
      if (!upTouchIds.has(id)) {
        // the ids that downTouchIDs don't have
        upTouchIds.delete(id)
        // You don't have to give an event to change the down state back to the down state
        downTouchIds.delete(id)
      }
    }

    // update touchState
    emitAllIDs(upTouchIds, false)
    emitAllIDs(downTouchIds, true)
  })

  useEvent(getWindow, 'touchend', (event) => {
    // touchend 가 모든 손가락 터치가 끝난 것이 아닙니다
    const touches = event.changedTouches
    const touchIds = getTouchedIds(touches, takeFirst)
    const upTouchIds = new Set(touchIds)

    for (const id of upTouchIds) {
      // down 된 목록에서 up 할 id 제거
      downIDs.delete(id)
    }
    emitAllIDs(upTouchIds, false)
  })
}
