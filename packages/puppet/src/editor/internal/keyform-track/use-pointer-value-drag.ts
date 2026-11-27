import {type Accessor, onCleanup} from 'solid-js'

export interface UsePointerValueDragProps {
  readonly enabled: Accessor<boolean>
  readonly getBounds: (event: PointerEvent) => DOMRect | undefined
  readonly onMove: (event: PointerEvent, bounds: DOMRect) => void
  readonly stopPropagation?: boolean
}

export interface UsePointerValueDragResult {
  readonly handlePointerDown: (event: PointerEvent) => void
}

export const usePointerValueDrag = (props: UsePointerValueDragProps): UsePointerValueDragResult => {
  let removeListeners: (() => void) | undefined
  const handlePointerDown = (event: PointerEvent) => {
    if (
      event.button !== 0 ||
      event.isPrimary === false ||
      removeListeners !== undefined ||
      !props.enabled()
    ) {
      return
    }
    const bounds = props.getBounds(event)
    if (bounds === undefined) {
      return
    }
    const {pointerId} = event
    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (!props.enabled()) {
        removeListeners?.()
        return
      }
      if (moveEvent.pointerId === pointerId) {
        moveEvent.preventDefault()
        props.onMove(moveEvent, bounds)
      }
    }
    const finishDrag = (finishEvent: PointerEvent) => {
      if (finishEvent.pointerId === pointerId) {
        removeListeners?.()
      }
    }
    const cancel = () => removeListeners?.()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        cancel()
      }
    }
    event.preventDefault()
    if (props.stopPropagation === true) {
      event.stopPropagation()
    }
    props.onMove(event, bounds)
    // Global pointer events follow the active gesture beyond the original element.
    // eslint-disable-next-line solid/reactivity
    removeListeners = () => {
      globalThis.removeEventListener('blur', cancel)
      globalThis.removeEventListener('keydown', handleKeyDown)
      globalThis.removeEventListener('pointercancel', finishDrag)
      globalThis.removeEventListener('pointermove', handlePointerMove)
      globalThis.removeEventListener('pointerup', finishDrag)
      removeListeners = undefined
    }
    globalThis.addEventListener('blur', cancel)
    globalThis.addEventListener('keydown', handleKeyDown)
    globalThis.addEventListener('pointercancel', finishDrag)
    globalThis.addEventListener('pointermove', handlePointerMove)
    globalThis.addEventListener('pointerup', finishDrag)
  }
  onCleanup(() => removeListeners?.())
  return {handlePointerDown}
}
