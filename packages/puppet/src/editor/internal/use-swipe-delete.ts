import {clamp} from 'es-toolkit/math'
import {type Accessor, createSignal, onCleanup} from 'solid-js'

const DELETE_THRESHOLD = 64
const MAXIMUM_OFFSET = 80
const SWIPE_ACTIVATION_DISTANCE = 4

export const useSwipeDelete = (onDelete: Accessor<(() => void) | undefined>) => {
  const [dragging, setDragging] = createSignal(false)
  const [offset, setOffset] = createSignal(0)
  const clickState = {ignore: false}
  let removeGestureListeners: (() => void) | undefined

  const finishGesture = (deleteWhenArmed: boolean, moved: boolean) => {
    const armed = offset() >= DELETE_THRESHOLD
    clickState.ignore = moved
    removeGestureListeners?.()
    setDragging(false)
    if (deleteWhenArmed && armed) {
      onDelete()?.()
      return
    }
    setOffset(0)
  }

  const handlePointerDown = (event: PointerEvent) => {
    if (
      event.button !== 0 ||
      dragging() ||
      onDelete() === undefined ||
      (event.target instanceof Element &&
        event.target.closest(
          'input, textarea, select, [contenteditable="true"], .editor-number-field, .parameter-value-control',
        ) !== null)
    ) {
      return
    }
    const initialPointerX = event.clientX
    const {pointerId} = event
    const initialOffset = offset()
    let moved = false
    removeGestureListeners?.()
    setDragging(true)
    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) {
        return
      }
      const pointerDelta = moveEvent.clientX - initialPointerX
      moved ||= Math.abs(pointerDelta) >= SWIPE_ACTIVATION_DISTANCE
      if (moved) {
        moveEvent.preventDefault()
      }
      setOffset(clamp(initialOffset + pointerDelta, 0, MAXIMUM_OFFSET))
    }
    const handlePointerUp = (upEvent: PointerEvent) => {
      if (upEvent.pointerId === pointerId) {
        finishGesture(true, moved)
      }
    }
    const handlePointerCancel = (cancelEvent: PointerEvent) => {
      if (cancelEvent.pointerId === pointerId) {
        finishGesture(false, moved)
      }
    }
    const handleBlur = () => finishGesture(false, moved)
    // The stored callback only removes native gesture listeners during completion or cleanup.
    // eslint-disable-next-line solid/reactivity
    removeGestureListeners = () => {
      globalThis.removeEventListener('pointercancel', handlePointerCancel)
      globalThis.removeEventListener('pointermove', handlePointerMove)
      globalThis.removeEventListener('pointerup', handlePointerUp)
      globalThis.removeEventListener('blur', handleBlur)
      removeGestureListeners = undefined
    }
    globalThis.addEventListener('pointercancel', handlePointerCancel)
    globalThis.addEventListener('pointermove', handlePointerMove)
    globalThis.addEventListener('pointerup', handlePointerUp)
    globalThis.addEventListener('blur', handleBlur)
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && offset() > 0) {
      event.preventDefault()
      setOffset(0)
      return
    }
    if (event.key !== 'Delete' || onDelete() === undefined) {
      return
    }
    event.preventDefault()
    if (offset() >= DELETE_THRESHOLD) {
      onDelete()?.()
      return
    }
    setOffset(MAXIMUM_OFFSET)
  }

  onCleanup(() => removeGestureListeners?.())

  return {
    armed: () => offset() >= DELETE_THRESHOLD,
    clickState,
    dragging,
    handleKeyDown,
    handlePointerDown,
    offset,
    reset: () => {
      clickState.ignore = false
      setOffset(0)
    },
  }
}
