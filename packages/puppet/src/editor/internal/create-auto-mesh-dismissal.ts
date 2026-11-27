import type {PopoverContentProps} from '@kobalte/core/popover'
import {type Accessor} from 'solid-js'
import {preventInternalDismiss} from '../../design-system/prevent-internal-dismiss'

export const createAutoMeshDismissal = (surface: Accessor<HTMLElement | undefined>) => {
  const internalTouches = new WeakSet<Event>()
  const onPointerDown = (event: PointerEvent) => {
    if (event.pointerType === 'touch') {
      internalTouches.add(event)
    }
  }
  const onPointerDownOutside = (
    event: Parameters<NonNullable<PopoverContentProps<'div'>['onPointerDownOutside']>>[0],
  ) => {
    // Kobalte defers touch dismissal until click, after the original composed path is cleared.
    if (internalTouches.has(event.detail.originalEvent)) {
      event.preventDefault()
      return
    }
    preventInternalDismiss(event, surface())
  }
  return {onPointerDown, onPointerDownOutside}
}
