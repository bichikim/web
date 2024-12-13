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

export const ELEMENT_IDENTIFIER_GLOBAL_TOUCH = `data-global-touch__`

/**
 * 전역에서 감지해서 통보할 엘리먼트 인지 여부확인
 */
export const getGlobalTouch = (element: Element): string | null => {
  return element.getAttribute(ELEMENT_IDENTIFIER_GLOBAL_TOUCH)
}

const emitAllIds = (ids: Set<string>, value: boolean) => {
  const window = getWindow()
  if (!window) {
    return
  }
  for (const id of ids) {
    const eventName = generateGlobalTouchEventName(id)
    window.dispatchEvent(new CustomEvent(eventName, {detail: value}))
  }
}

const emitAllDragIds = (downTouchIDs: InfoIds) => {
  const {ids, point} = downTouchIDs
  const window = getWindow()
  if (!window) {
    return
  }
  for (const id of ids) {
    const eventName = generateGlobalTouchDragEventName(id)
    window.dispatchEvent(new CustomEvent(eventName, {detail: point}))
  }
}

const emitAllMultiIDs = (downTouchIDs: Map<number, Set<string>>, value: boolean) => {
  for (const idSet of downTouchIDs.values()) {
    emitAllIds(idSet, value)
  }
}

const generateGlobalTouchEventName = (id: string): string => {
  return `global-touch__${id}`
}

const generateGlobalTouchDragEventName = (id: string): string => {
  return `global-touch-drag__${id}`
}

export interface DownState {
  down: boolean
  point: Position | undefined
}

export const useGlobalTouch = (id: string): Accessor<boolean> => {
  const [isDown, setIsDown] = createSignal<boolean>(false)
  const eventName = generateGlobalTouchEventName(id)

  useEvent(getWindow, eventName, ({detail: down}: CustomEvent<boolean>) => {
    setIsDown(down)
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

const getPointedIds = (position: Position, takeFirst: boolean = false): InfoIds => {
  const elements = getElementsFromPoint(position)
  return {
    ids: new Set(takeFirst ? findTouchFirstId(elements) : findTouchIds(elements)),
    point: position,
  }
}

export interface InfoIds {
  ids: Set<string>
  point: Position | undefined
}

export const getTouchedIds = (touches: TouchList, takeFirst: boolean = false) => {
  const touchIDs: Map<number, InfoIds> = new Map()
  const touchesLength = touches.length
  for (let index = 0; index < touchesLength; index += 1) {
    const touch = touches[index]
    const {identifier} = touch
    const elements = getElementsFromPoint({x: touch.clientX, y: touch.clientY})
    const touchedElementIDs = takeFirst
      ? findTouchFirstId(elements)
      : findTouchIds(elements)
    for (const touchedElementID of touchedElementIDs) {
      const {ids: touchSets} = touchIDs.get(identifier) ?? {
        ids: new Set<string>(),
        touch: undefined,
      }
      touchSets.add(touchedElementID)
      touchIDs.set(identifier, {ids: touchSets, point: {x: touch.pageX, y: touch.pageY}})
    }
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
  let downIDs: Map<number, Set<string>> = new Map()
  let mouseDown: boolean = false
  const mouseId = -1
  const {topLevelElementOnly: takeFirst = false, preventTouchContext} = options

  if (preventTouchContext) {
    useEvent(getWindow, 'contextmenu', (event: any) => {
      event.preventDefault()
    })
  }

  useEvent(getWindow, 'pointerdown', (event: PointerEvent) => {
    // skip touch down
    if (event.pointerType === 'touch') {
      return
    }
    mouseDown = true
    const {ids, point} = getPointedIds({x: event.pageX, y: event.pageY}, takeFirst)
    downIDs = new Map<number, Set<string>>([[mouseId, ids]])
    emitAllMultiIDs(downIDs, true)
  })

  useEvent(getWindow, 'pointerup', (event: PointerEvent) => {
    // skip touch down
    if (event.pointerType === 'touch') {
      return
    }

    mouseDown = false
    //
    emitAllMultiIDs(downIDs, false)
    downIDs = new Map()
  })

  useEvent(getWindow, 'pointermove', (event: PointerEvent) => {
    // skip touch down
    if (event.pointerType === 'touch' || !mouseDown) {
      return
    }
    const _downIds = downIDs.get(mouseId)
    const upTouchIds: Set<string> = new Set(_downIds)
    const {ids: downTouchIds, point} = getPointedIds(
      {x: event.pageX, y: event.pageY},
      takeFirst,
    )
    // const downTouchIds = new Set(
    //   getPointedIds({x: event.clientX, y: event.clientY}, takeFirst),
    // )
    downIDs = new Map<number, Set<string>>([[mouseId, new Set(downTouchIds)]])

    for (const id of downTouchIds) {
      if (upTouchIds.has(id)) {
        upTouchIds.delete(id)
      }
    }

    emitAllIds(downTouchIds, true)
    emitAllIds(upTouchIds, false)
  })

  useEvent(getWindow, 'touchstart', (event) => {
    const touches = event.changedTouches
    const touchIds = getTouchedIds(touches, takeFirst)
    for (const [identifier, {ids, point}] of touchIds.entries()) {
      downIDs.set(identifier, ids)
      emitAllIds(ids, true)
    }
  })

  useEvent(getWindow, 'touchmove', (event) => {
    const touches = event.changedTouches
    const touchIdsMap = getTouchedIds(touches, takeFirst)
    for (const [identifier, ids] of downIDs) {
      const {ids: _ids, point} = touchIdsMap.get(identifier) ?? {}
      const touchIds: Set<string> = new Set(_ids)
      const upTouchIds = new Set<string>(ids)
      const downTouchIds = new Set(touchIds)
      for (const id of touchIds) {
        if (ids.has(id)) {
          upTouchIds.delete(id)
          downTouchIds.delete(id)
        }
      }
      downIDs.set(identifier, touchIds)
      emitAllDragIds({ids: touchIds, point})
      emitAllIds(downTouchIds, true)
      emitAllIds(upTouchIds, false)
    }
  })

  useEvent(getWindow, 'touchend', (event) => {
    event.preventDefault()
    const touches = event.changedTouches
    const touchIds = getTouchedIds(touches, takeFirst)
    for (const [identifier, {ids: idSet, point}] of touchIds.entries()) {
      const _ids = downIDs.get(identifier)
      const downTouchIds: Set<string> = new Set(_ids)
      const upTouchIds: Set<string> = new Set(idSet)
      for (const id of upTouchIds) {
        // down 된 목록에서 up 할 id 제거
        downTouchIds.delete(id)
      }
      downIDs.set(identifier, downTouchIds)
      emitAllIds(upTouchIds, false)
    }
  })
}
