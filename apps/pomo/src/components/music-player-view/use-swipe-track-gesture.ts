import {type Accessor, createSignal, type JSX, onCleanup} from 'solid-js'

export interface UseSwipeTrackGestureProps {
  readonly enabled: Accessor<boolean>
  readonly onRemove: () => void
}

export interface SwipeTrackGesture {
  readonly deleteReady: Accessor<boolean>
  readonly dragging: Accessor<boolean>
  readonly offset: Accessor<number>
  readonly handleClick: JSX.EventHandler<HTMLButtonElement, MouseEvent>
  readonly handlePointerDown: JSX.EventHandler<HTMLButtonElement, PointerEvent>
  readonly handlePointerMove: JSX.EventHandler<HTMLButtonElement, PointerEvent>
  readonly handlePointerUp: JSX.EventHandler<HTMLButtonElement, PointerEvent>
  readonly handlePointerCancel: JSX.EventHandler<HTMLButtonElement, PointerEvent>
  readonly handleLostPointerCapture: JSX.EventHandler<HTMLButtonElement, PointerEvent>
}

const DELETE_COMMIT_DISTANCE = 64
const DRAG_INTENT_DISTANCE = 8
const MAX_SWIPE_DISTANCE = 80

const releasePointer = (element: HTMLButtonElement, pointerId: number) => {
  if (element.hasPointerCapture?.(pointerId)) {
    element.releasePointerCapture(pointerId)
  }
}

export const useSwipeTrackGesture = (props: UseSwipeTrackGestureProps): SwipeTrackGesture => {
  let activePointerId: number | undefined
  let gestureAxis: 'horizontal' | 'pending' | 'vertical' = 'pending'
  let startX = 0
  let startY = 0
  let suppressClick = false
  const [dragging, setDragging] = createSignal(false)
  const [offset, setOffset] = createSignal(0)
  const deleteReady = () => Math.abs(offset()) >= DELETE_COMMIT_DISTANCE

  const resetSwipe = () => {
    activePointerId = undefined
    gestureAxis = 'pending'
    setDragging(false)
    setOffset(0)
  }

  const handlePointerDown: JSX.EventHandler<HTMLButtonElement, PointerEvent> = (event) => {
    if (!props.enabled() || event.button !== 0) {
      return
    }

    activePointerId = event.pointerId
    gestureAxis = 'pending'
    startX = event.clientX
    startY = event.clientY
    suppressClick = false
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  const handlePointerMove: JSX.EventHandler<HTMLButtonElement, PointerEvent> = (event) => {
    if (event.pointerId !== activePointerId || gestureAxis === 'vertical') {
      return
    }

    const horizontalDistance = event.clientX - startX
    const verticalDistance = event.clientY - startY

    if (gestureAxis === 'pending') {
      if (
        Math.max(Math.abs(horizontalDistance), Math.abs(verticalDistance)) < DRAG_INTENT_DISTANCE
      ) {
        return
      }

      gestureAxis =
        Math.abs(horizontalDistance) > Math.abs(verticalDistance) ? 'horizontal' : 'vertical'

      if (gestureAxis === 'vertical') {
        activePointerId = undefined
        releasePointer(event.currentTarget, event.pointerId)
        return
      }
    }

    event.preventDefault()
    suppressClick = true
    setDragging(true)
    setOffset(
      Math.sign(horizontalDistance) * Math.min(Math.abs(horizontalDistance), MAX_SWIPE_DISTANCE),
    )
  }

  const handlePointerUp: JSX.EventHandler<HTMLButtonElement, PointerEvent> = (event) => {
    if (event.pointerId !== activePointerId) {
      return
    }

    const shouldRemove = gestureAxis === 'horizontal' && deleteReady()
    resetSwipe()
    releasePointer(event.currentTarget, event.pointerId)
    if (shouldRemove) {
      props.onRemove()
    }
  }

  const handlePointerCancel: JSX.EventHandler<HTMLButtonElement, PointerEvent> = (event) => {
    if (event.pointerId !== activePointerId) {
      return
    }

    suppressClick = gestureAxis === 'horizontal'
    resetSwipe()
    releasePointer(event.currentTarget, event.pointerId)
  }

  const handleLostPointerCapture: JSX.EventHandler<HTMLButtonElement, PointerEvent> = (event) => {
    if (event.pointerId !== activePointerId) {
      return
    }

    suppressClick = gestureAxis === 'horizontal'
    resetSwipe()
  }

  const handleClick: JSX.EventHandler<HTMLButtonElement, MouseEvent> = (event) => {
    if (!suppressClick) {
      return
    }

    event.preventDefault()
    suppressClick = false
  }

  onCleanup(() => {
    activePointerId = undefined
  })

  return {
    deleteReady,
    dragging,
    handleClick,
    handleLostPointerCapture,
    handlePointerCancel,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    offset,
  }
}
