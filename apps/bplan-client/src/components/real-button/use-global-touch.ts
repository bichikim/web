import {useEvent} from '@winter-love/solid-use'
import {getDocument, getWindow, Position} from '@winter-love/utils'
import {Accessor, createSignal} from 'solid-js'
import {
  DownEventPayload,
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
export const PREVENT_GLOBAL_TOUCH_FLAG = '__prevent__'

export const preventGlobalTouchAttrs = () => ({
  [ELEMENT_IDENTIFIER_GLOBAL_TOUCH]: PREVENT_GLOBAL_TOUCH_FLAG,
})

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

    if (id === PREVENT_GLOBAL_TOUCH_FLAG) {
      return []
    }

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

    if (isString(id) && id !== PREVENT_GLOBAL_TOUCH_FLAG) {
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

export const getTouchedIds = (touches: TouchList, takeFirst: boolean = false) => {
  const ids: Set<string> = new Set()
  const touchesLength = touches.length

  for (let index = 0; index < touchesLength; index += 1) {
    const touch = touches[index]
    const elements = getElementsFromPoint({x: touch.clientX, y: touch.clientY})
    const touchedElementIDs = takeFirst
      ? findTouchFirstId(elements)
      : findTouchIds(elements)

    for (const touchedElementID of touchedElementIDs) {
      ids.add(touchedElementID)
    }
  }

  return ids
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
  const savedDownIds: Set<string> = new Set()
  let mouseDown: boolean = false
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
    const {ids} = getPointedIds({x: event.pageX, y: event.pageY}, takeFirst)

    emitAllIds(ids, true)

    for (const id of ids) {
      savedDownIds.add(id)
    }
    // emitAllDragIds({ids, point, state: 'start'})
  })

  useEvent(getWindow, 'pointerup', (event: PointerEvent) => {
    // skip touch down
    if (event.pointerType === 'touch') {
      return
    }

    mouseDown = false
    //
    emitAllIds(savedDownIds, false)
    savedDownIds.clear()
  })

  useEvent(getWindow, 'pointermove', (event: PointerEvent) => {
    if (event.pointerType === 'touch' || !mouseDown) {
      return
    }

    const {ids} = getPointedIds({x: event.pageX, y: event.pageY}, takeFirst)
    const downIds = new Set(ids)
    const upIds = new Set(savedDownIds)

    for (const id of ids) {
      if (savedDownIds.has(id)) {
        downIds.delete(id)
      }

      savedDownIds.add(id)
      upIds.delete(id)
    }

    for (const id of upIds) {
      savedDownIds.delete(id)
    }

    emitAllIds(downIds, true)
    emitAllIds(upIds, false)
  })

  useEvent(getWindow, 'touchstart', (event) => {
    const {touches} = event
    const touchIds = getTouchedIds(touches, takeFirst)
    const downIds = new Set<string>(touchIds)

    for (const id of touchIds) {
      if (savedDownIds.has(id)) {
        downIds.delete(id)
      }

      savedDownIds.add(id)
    }

    emitAllIds(downIds, true)
  })

  const updateDownIds = (event: TouchEvent) => {
    const {touches} = event
    const touchIds = getTouchedIds(touches, takeFirst)
    const downIds = new Set<string>(touchIds)
    const upIds = new Set<string>(savedDownIds)

    for (const id of touchIds) {
      if (savedDownIds.has(id)) {
        downIds.delete(id)
      }

      upIds.delete(id)
      savedDownIds.add(id)
    }

    for (const id of upIds) {
      savedDownIds.delete(id)
    }

    emitAllIds(downIds, true)
    emitAllIds(upIds, false)
  }

  useEvent(getWindow, 'touchmove', updateDownIds)
  useEvent(getWindow, 'touchend', updateDownIds)
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
