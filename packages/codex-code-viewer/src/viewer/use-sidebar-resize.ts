import {type Accessor, createEffect, createMemo, createSignal, untrack} from 'solid-js'

interface UseSidebarResizeProps {
  availableWidth: Accessor<number>
  contentMinimum: Accessor<number>
  minimum: Accessor<number>
  spacing: Accessor<number>
  visible: Accessor<boolean>
  initialWidth?: number
}
interface PointerDrag {
  readonly pointer: number
  readonly start: number
  readonly width: number
}

export const useSidebarResize = (props: UseSidebarResizeProps) => {
  const INITIAL_WIDTH = 288
  const KEYBOARD_STEP = 16
  const initial = untrack(() => props.initialWidth ?? INITIAL_WIDTH)
  const [preferred, setPreferred] = createSignal(initial)
  const [drag, setDrag] = createSignal<PointerDrag | null>(null)
  const maximum = createMemo(() => {
    const available = props.availableWidth()
    return Math.max(
      props.minimum(),
      available > 0 ? available - props.contentMinimum() - props.spacing() : initial,
    )
  })
  const clamp = (value: number): number =>
    Math.round(Math.min(maximum(), Math.max(props.minimum(), value)))
  const width = createMemo(() => clamp(preferred()))
  createEffect(() => {
    if (!props.visible()) {
      setDrag(null)
    }
  })
  const begin = (pointer: number, position: number): void => {
    if (props.visible() && drag() === null) {
      setDrag({pointer, start: position, width: width()})
    }
  }
  const move = (pointer: number, position: number): void => {
    const current = drag()
    if (current !== null && current.pointer === pointer) {
      setPreferred(clamp(current.width + current.start - position))
    }
  }
  const end = (pointer: number): void => {
    if (drag()?.pointer === pointer) {
      setDrag(null)
    }
  }
  const keyboard = (key: string): boolean => {
    const current = width()
    switch (key) {
      case 'ArrowLeft':
        setPreferred(clamp(current + KEYBOARD_STEP))
        return true
      case 'ArrowRight':
        setPreferred(clamp(current - KEYBOARD_STEP))
        return true
      case 'Home':
        setPreferred(props.minimum())
        return true
      case 'End':
        setPreferred(maximum())
        return true
      default:
        return false
    }
  }
  return {begin, dragging: () => drag() !== null, end, keyboard, maximum, move, width}
}
