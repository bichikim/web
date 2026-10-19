import {type Accessor, createMemo, createSignal} from 'solid-js'
import {DEFAULT_POFFO_PLACEMENT, type PoffoPlacement} from '@winter-love/wallpaper/settings/model'

interface UsePlacementProps {
  readonly enabled?: Accessor<boolean>
  readonly value?: Accessor<PoffoPlacement | undefined>
  readonly onChange?: (placement: PoffoPlacement) => void | Promise<void>
}
interface PlacementPointer {
  readonly button: number
  readonly pointerId: number
  readonly clientX: number
  readonly clientY: number
  readonly currentTarget: {
    getBoundingClientRect(): {readonly width: number; readonly height: number}
    setPointerCapture(id: number): void
    releasePointerCapture(id: number): void
  }
  preventDefault(): void
}
interface PlacementDrag {
  readonly pointerId: number
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
  readonly origin: PoffoPlacement
}
const KEY_STEP = 0.02
const constrain = (value: number) => Math.min(1, Math.max(0, value))

export const usePlacement = (props: UsePlacementProps) => {
  const [draft, setDraft] = createSignal<PoffoPlacement | null>(null)
  const [drag, setDrag] = createSignal<PlacementDrag | null>(null)
  const placement = createMemo(() => draft() ?? props.value?.() ?? DEFAULT_POFFO_PLACEMENT)
  const start = (event: PlacementPointer) => {
    if (props.enabled?.() === false || props.onChange === undefined || event.button !== 0) {
      return
    }
    const bounds = event.currentTarget.getBoundingClientRect()
    if (bounds.width === 0 || bounds.height === 0) {
      return
    }
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    setDrag({
      height: bounds.height,
      origin: placement(),
      pointerId: event.pointerId,
      width: bounds.width,
      x: event.clientX,
      y: event.clientY,
    })
  }
  const move = (event: PlacementPointer) => {
    const active = drag()
    if (active === null || active.pointerId !== event.pointerId) {
      return
    }
    setDraft({
      ...active.origin,
      x: constrain(active.origin.x + (event.clientX - active.x) / active.width),
      y: constrain(active.origin.y + (event.clientY - active.y) / active.height),
    })
  }
  const cancel = () => {
    setDrag(null)
    setDraft(null)
  }
  const finish = (event: PlacementPointer) => {
    const active = drag()
    if (active === null || active.pointerId !== event.pointerId) {
      return
    }
    const next = draft()
    cancel()
    event.currentTarget.releasePointerCapture(event.pointerId)
    if (next !== null) {
      return props.onChange?.(next)
    }
  }
  const keyboard = (event: {readonly key: string; preventDefault(): void}) => {
    if (props.enabled?.() === false || props.onChange === undefined) {
      return
    }
    const current = placement()
    let next: PoffoPlacement
    switch (event.key) {
      case 'ArrowLeft':
        next = {...current, x: constrain(current.x - KEY_STEP)}
        break
      case 'ArrowRight':
        next = {...current, x: constrain(current.x + KEY_STEP)}
        break
      case 'ArrowUp':
        next = {...current, y: constrain(current.y - KEY_STEP)}
        break
      case 'ArrowDown':
        next = {...current, y: constrain(current.y + KEY_STEP)}
        break
      default:
        return
    }
    event.preventDefault()
    return props.onChange(next)
  }
  return {cancel, dragging: () => drag() !== null, finish, keyboard, move, placement, start}
}
