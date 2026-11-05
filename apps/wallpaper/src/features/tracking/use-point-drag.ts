import {type Accessor, createMemo, createSignal, onCleanup} from 'solid-js'
import type {TrackingPoint} from './types'
export interface PointBounds {
  readonly minX: number
  readonly minY: number
  readonly maxX: number
  readonly maxY: number
}
interface PointPointer {
  readonly button: number
  readonly pointerId: number
  readonly clientX: number
  readonly clientY: number
  readonly currentTarget: {
    focus(options?: FocusOptions): void
    hasPointerCapture(id: number): boolean
    setPointerCapture(id: number): void
    releasePointerCapture(id: number): void
  }
  preventDefault(): void
}
interface PointDrag {
  readonly id: number
  readonly target: PointPointer['currentTarget']
  readonly origin: TrackingPoint
  readonly start: TrackingPoint
  readonly width: number
  readonly height: number
  readonly bounds: PointBounds
  readonly view: PointBounds
}
interface UsePointDragProps {
  readonly value: Accessor<TrackingPoint>
  readonly bounds: Accessor<PointBounds>
  readonly view?: Accessor<PointBounds>
  readonly rect: () =>
    | {
        readonly width: number
        readonly height: number
      }
    | undefined
  readonly step?: Accessor<number>
  readonly disabled?: Accessor<boolean>
  readonly onPreview?: (point: TrackingPoint | null) => void
  readonly onChange?: (point: TrackingPoint) => void | Promise<void>
}
const KEY_STEP = 0.01
const constrain = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
/** Previews two-dimensional pointer movement and commits once on release or keyboard input. */
export const usePointDrag = (props: UsePointDragProps) => {
  const [draft, setDraft] = createSignal<TrackingPoint | null>(null)
  const [drag, setDrag] = createSignal<PointDrag | null>(null)
  const point = createMemo(() => draft() ?? props.value())
  const cancel = () => {
    const active = drag()
    setDrag(null)
    setDraft(null)
    if (active !== null && active.target.hasPointerCapture(active.id)) {
      active.target.releasePointerCapture(active.id)
    }
    props.onPreview?.(null)
  }
  onCleanup(cancel)
  const start = (event: PointPointer, initial?: TrackingPoint) => {
    const rect = props.rect()
    if (
      event.button !== 0 ||
      props.disabled?.() ||
      props.onChange === undefined ||
      rect === undefined ||
      rect.width <= 0 ||
      rect.height <= 0
    ) {
      return
    }
    event.preventDefault()
    event.currentTarget.focus({preventScroll: true})
    event.currentTarget.setPointerCapture(event.pointerId)
    const bounds = props.bounds()
    const origin =
      initial === undefined
        ? point()
        : {
            x: constrain(initial.x, bounds.minX, bounds.maxX),
            y: constrain(initial.y, bounds.minY, bounds.maxY),
          }
    setDrag({
      bounds,
      height: rect.height,
      id: event.pointerId,
      origin,
      start: {x: event.clientX, y: event.clientY},
      target: event.currentTarget,
      view: props.view?.() ?? bounds,
      width: rect.width,
    })
    if (initial !== undefined) {
      setDraft(origin)
      props.onPreview?.(origin)
    }
  }
  const move = (event: PointPointer) => {
    const active = drag()
    if (active === null || active.id !== event.pointerId) {
      return
    }
    const {bounds, view} = active
    const next = {
      x: constrain(
        active.origin.x +
          ((event.clientX - active.start.x) / active.width) * (view.maxX - view.minX),
        bounds.minX,
        bounds.maxX,
      ),
      y: constrain(
        active.origin.y +
          ((event.clientY - active.start.y) / active.height) * (view.maxY - view.minY),
        bounds.minY,
        bounds.maxY,
      ),
    }
    setDraft(next)
    props.onPreview?.(next)
  }
  const finish = (event: PointPointer) => {
    if (drag()?.id !== event.pointerId) {
      return
    }
    const next = draft()
    cancel()
    if (next !== null) {
      return props.onChange?.(next)
    }
  }
  const keyboard = (event: {readonly key: string; preventDefault(): void}) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      cancel()
      return
    }
    if (props.disabled?.() || props.onChange === undefined) {
      return
    }
    const current = point()
    const bounds = props.bounds()
    const horizontal = props.step?.() ?? KEY_STEP
    const vertical = horizontal
    let next: TrackingPoint
    switch (event.key) {
      case 'ArrowLeft':
        next = {...current, x: constrain(current.x - horizontal, bounds.minX, bounds.maxX)}
        break
      case 'ArrowRight':
        next = {...current, x: constrain(current.x + horizontal, bounds.minX, bounds.maxX)}
        break
      case 'ArrowUp':
        next = {...current, y: constrain(current.y - vertical, bounds.minY, bounds.maxY)}
        break
      case 'ArrowDown':
        next = {...current, y: constrain(current.y + vertical, bounds.minY, bounds.maxY)}
        break
      default:
        return
    }
    event.preventDefault()
    cancel()
    return props.onChange(next)
  }
  return {cancel, dragging: () => drag() !== null, finish, keyboard, move, point, start}
}
