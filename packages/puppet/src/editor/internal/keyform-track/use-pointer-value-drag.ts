import {type Accessor, getOwner, onCleanup, runWithOwner} from 'solid-js'

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
  const owner = getOwner()
  let removeListeners: (() => void) | undefined
  const enabled = () => (owner === null ? props.enabled() : runWithOwner(owner, props.enabled))
  const update = (event: PointerEvent, bounds: DOMRect) => {
    const move = () => props.onMove(event, bounds)
    return owner === null ? move() : runWithOwner(owner, move)
  }
  const handlePointerDown = (event: PointerEvent) => {
    if (event.button !== 0 || !enabled()) {
      return
    }
    const bounds = props.getBounds(event)
    if (bounds === undefined) {
      return
    }
    const {pointerId} = event
    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId === pointerId) {
        moveEvent.preventDefault()
        update(moveEvent, bounds)
      }
    }
    const finishDrag = (finishEvent: PointerEvent) => {
      if (finishEvent.pointerId === pointerId) {
        removeListeners?.()
      }
    }
    event.preventDefault()
    if (props.stopPropagation === true) {
      event.stopPropagation()
    }
    removeListeners?.()
    update(event, bounds)
    // Global pointer events follow the active gesture beyond the original element.
    // eslint-disable-next-line solid/reactivity
    removeListeners = () => {
      globalThis.removeEventListener('pointercancel', finishDrag)
      globalThis.removeEventListener('pointermove', handlePointerMove)
      globalThis.removeEventListener('pointerup', finishDrag)
      removeListeners = undefined
    }
    globalThis.addEventListener('pointercancel', finishDrag)
    globalThis.addEventListener('pointermove', handlePointerMove)
    globalThis.addEventListener('pointerup', finishDrag)
  }
  onCleanup(() => removeListeners?.())
  return {handlePointerDown}
}
