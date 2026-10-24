import {Accessor, createMemo, createSignal} from 'solid-js'
import {MaybeAccessor, resolveAccessor, useEvent} from '@winter-love/solid-use'
import {freeze, getWindow, Position} from '@winter-love/utils'

export interface DragProps {
  dragEndSize?: number
  onEnd?: (event: MouseEvent | TouchEvent, data: Position) => void
  onStart?: (event: MouseEvent | TouchEvent, data: Position) => void
}

interface StartData {
  identifier: number
  x: number
  y: number
}

interface DragData {
  current?: Position
  started: StartData
}

export interface UseDragActions {
  handleMouseDown: (event: MouseEvent) => void
  handleTouchStart: (event: TouchEvent) => void
}

const findTouch = (list: TouchList, identifier: number) => {
  for (const item of list) {
    if (item.identifier === identifier) {
      return item
    }
  }
}

const DEFAULT_DRAG_END_SIZE = 50

const clampDragPosition = (current: Position | undefined, dragEndSize: number): Position => {
  if (!dragEndSize) {
    return {x: 0, y: 0}
  }

  return {
    x: Math.max(-dragEndSize, Math.min(current?.x ?? 0, dragEndSize)),
    y: Math.max(-dragEndSize, Math.min(current?.y ?? 0, dragEndSize)),
  }
}

export const useDrag = (
  props: MaybeAccessor<DragProps>,
): readonly [Accessor<Position>, UseDragActions] => {
  const innerProps = resolveAccessor(props)
  const [drag, setDrag] = createSignal<DragData>({started: {identifier: -1, x: 0, y: 0}})

  const position = createMemo((): Position => {
    const {dragEndSize = DEFAULT_DRAG_END_SIZE} = innerProps()

    return clampDragPosition(drag().current, dragEndSize)
  })

  const identifier = createMemo(() => drag().started.identifier)

  const globalElement = createMemo(() => {
    const window = getWindow()
    const _identifier = identifier()

    if (!window) {
      return null
    }

    if (_identifier === -1) {
      return null
    }

    return window
  })

  const handleEnd = (event: MouseEvent | TouchEvent, data?: Position) => {
    if (data) {
      innerProps().onEnd?.(event, data)
    }

    handleCancel()
  }

  const handleCancel = () => {
    setDrag({
      current: undefined,
      started: {identifier: -1, x: 0, y: 0},
    })
  }

  const handleStart = (event: MouseEvent | TouchEvent, data: StartData) => {
    innerProps().onStart?.(event, {
      x: data.x,
      y: data.y,
    })

    setDrag({
      current: undefined,
      started: data,
    })
  }

  const handleMove = (data: Position) => {
    setDrag((prev) => ({
      ...prev,
      current: {
        x: data.x,
        y: data.y,
      },
    }))
  }

  const handleMouseDown = (event: MouseEvent) => {
    handleStart(event, {
      identifier: 999_999,
      x: event.clientX,
      y: event.clientY,
    })
  }

  const handleTouchStart = (event: TouchEvent) => {
    const [touch] = event.touches

    if (touch) {
      handleStart(event, {
        identifier: touch.identifier,
        x: touch.clientX,
        y: touch.clientY,
      })
    }
  }

  const handleTouchMove = (event: TouchEvent) => {
    const {
      started: {identifier, x, y},
    } = drag()
    const item = findTouch(event.changedTouches, identifier)

    if (!item) {
      return
    }

    handleMove({
      x: item.clientX - x,
      y: item.clientY - y,
    })
  }

  const handleMouseMove = (event: MouseEvent) => {
    const {
      started: {identifier, x, y},
    } = drag()

    if (identifier === -1) {
      return
    }

    handleMove({
      x: event.clientX - x,
      y: event.clientY - y,
    })
  }

  const handlePointerUp = (event: PointerEvent) => {
    if (event.pointerType === 'touch') {
      return
    }

    const {
      started: {x, y},
    } = drag()

    handleEnd(event, {
      x: event.clientX - x,
      y: event.clientY - y,
    })
  }

  const handleTouchEnd = (event: TouchEvent) => {
    const {
      started: {identifier, x, y},
    } = drag()

    if (identifier === -1) {
      return
    }

    const item = findTouch(event.changedTouches, identifier)

    if (!item) {
      return handleEnd(event)
    }

    const {clientX, clientY} = item
    const draggedX = clientX - x
    const draggedY = clientY - y

    handleEnd(event, {
      x: draggedX,
      y: draggedY,
    })
  }

  useEvent(globalElement, 'touchend', handleTouchEnd)
  useEvent(globalElement, 'touchcancel', handleCancel)
  useEvent(globalElement, 'touchmove', handleTouchMove)
  useEvent(globalElement, 'pointerup', handlePointerUp)
  useEvent(globalElement, 'pointercancel', handleCancel)
  useEvent(globalElement, 'mousemove', handleMouseMove)
  useEvent(globalElement, 'blur', handleCancel)

  return freeze([
    position,
    {
      handleMouseDown,
      handleTouchStart,
    },
  ])
}
