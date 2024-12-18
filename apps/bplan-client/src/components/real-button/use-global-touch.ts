import {useEvent} from '@winter-love/solid-use'
import {getDocument, getWindow, Position} from '@winter-love/utils'
import {Accessor, createSignal} from 'solid-js'
import {
  DownEventPayload,
  DragInfoIds,
  DragPayload,
  InfoIds,
  UseGlobalTouchEmitterOptions,
} from './types'

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

export const emitAllIds = (
  ids: Set<string>,
  value: boolean,
  renderOnly: boolean = false,
) => {
  const window = getWindow()

  if (!window) {
    return
  }

  for (const id of ids) {
    const eventName = generateGlobalTouchEventName(id)
    window.dispatchEvent(new CustomEvent(eventName, {detail: {down: value, renderOnly}}))
  }
}

const emitAllDragIds = (downTouchIDs: DragInfoIds) => {
  const {ids, point, state} = downTouchIDs
  const window = getWindow()

  if (!window) {
    return
  }

  for (const id of ids) {
    const eventName = generateGlobalTouchDragEventName(id)
    window.dispatchEvent(
      new CustomEvent<DragPayload>(eventName, {detail: {point, state}}),
    )
  }
}

const emitAllMultiIDs = (downTouchIDs: Map<number, Set<string>>, value: boolean) => {
  for (const idSet of downTouchIDs.values()) {
    emitAllIds(idSet, value)
  }
}

export const generateGlobalTouchEventName = (id: string): string => {
  return `global-touch__${id}`
}

const generateGlobalTouchDragEventName = (id: string): string => {
  return `global-touch-drag__${id}`
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

export const getTouchedIdsMap = (touches: TouchList, takeFirst: boolean = false) => {
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

export const useGlobalTouchEmitter = (options: UseGlobalTouchEmitterOptions = {}) => {
  let savedDownIds: Map<number, Set<string>> = new Map()
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
    savedDownIds = new Map<number, Set<string>>([[mouseId, ids]])
    emitAllIds(ids, true)
    emitAllDragIds({ids, point, state: 'start'})
  })

  useEvent(getWindow, 'pointerup', (event: PointerEvent) => {
    // skip touch down
    if (event.pointerType === 'touch') {
      return
    }

    mouseDown = false
    //
    emitAllMultiIDs(savedDownIds, false)
    savedDownIds = new Map()
  })

  useEvent(getWindow, 'pointermove', (event: PointerEvent) => {
    // skip touch down
    if (event.pointerType === 'touch' || !mouseDown) {
      return
    }
    const downedIds = savedDownIds.get(mouseId)
    const upTouchIds: Set<string> = new Set(downedIds)
    const {ids: downTouchIds, point} = getPointedIds(
      {x: event.pageX, y: event.pageY},
      takeFirst,
    )

    savedDownIds = new Map<number, Set<string>>([[mouseId, new Set(downTouchIds)]])

    for (const id of downTouchIds) {
      if (upTouchIds.has(id)) {
        upTouchIds.delete(id)
      }
    }

    emitAllIds(downTouchIds, true)
    emitAllIds(upTouchIds, false)
    emitAllDragIds({ids: downTouchIds, point, state: 'move'})
  })

  useEvent(getWindow, 'touchstart', (event) => {
    const touches = event.changedTouches
    const touchIds = getTouchedIdsMap(touches, takeFirst)

    for (const [identifier, {ids, point}] of touchIds.entries()) {
      savedDownIds.set(identifier, ids)
      emitAllIds(ids, true)
      emitAllDragIds({ids, point, state: 'start'})
    }
  })

  useEvent(getWindow, 'touchmove', (event) => {
    const touches = event.changedTouches
    const touchIdsMap = getTouchedIdsMap(touches, takeFirst)

    for (const [identifier, downedIds] of savedDownIds) {
      const {ids: newDownIds = new Set<string>(), point} =
        touchIdsMap.get(identifier) ?? {}
      const upTouchIds = new Set<string>(downedIds)
      const downTouchIds = new Set(newDownIds)
      const touchMoveIds = new Set<string>()

      for (const id of newDownIds) {
        if (downedIds.has(id)) {
          upTouchIds.delete(id)
          downTouchIds.delete(id)
          touchMoveIds.add(id)
        }
      }

      savedDownIds.set(identifier, newDownIds)
      emitAllIds(downTouchIds, true)
      emitAllIds(upTouchIds, false)
      // emitAllDragIds({ids: upTouchIds, point, state: 'end'})
      emitAllDragIds({ids: touchMoveIds, point, state: 'move'})
      emitAllDragIds({ids: downTouchIds, point, state: 'start'})
    }
  })

  useEvent(getWindow, 'touchend', (event) => {
    event.preventDefault()

    const touches = event.changedTouches
    const touchIdsMap = getTouchedIdsMap(touches, takeFirst)

    for (const [identifier, {ids}] of touchIdsMap.entries()) {
      const downedIds = savedDownIds.get(identifier)
      const downTouchIds: Set<string> = new Set(downedIds)
      const upTouchIds: Set<string> = new Set(ids)

      for (const id of upTouchIds) {
        // down 된 목록에서 up 할 id 제거
        downTouchIds.delete(id)
      }

      savedDownIds.set(identifier, downTouchIds)
      emitAllIds(upTouchIds, false)
      // emitAllDragIds({ids, point, state: 'end'})
    }
  })
}

export const useGlobalDown = (id: string): Accessor<DownEventPayload> => {
  const [isDown, setIsDown] = createSignal<DownEventPayload>({
    down: false,
    renderOnly: false,
  })
  const eventName = generateGlobalTouchEventName(id)

  useEvent(
    getWindow,
    eventName,
    ({detail: {down, renderOnly}}: CustomEvent<DownEventPayload>) => {
      setIsDown({down, renderOnly})
    },
  )

  return isDown
}

export const useGlobalDragPoint = (id: string): Accessor<DragPayload> => {
  const [point, setPoint] = createSignal<DragPayload>({point: {x: 0, y: 0}})
  const eventName = generateGlobalTouchDragEventName(id)

  useEvent(getWindow, eventName, ({detail: {point, state}}: CustomEvent<DragPayload>) => {
    setPoint({point, state})
  })

  return point
}
