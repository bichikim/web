import {type Accessor, createEffect, createMemo, createSignal, untrack} from 'solid-js'
import {sidebarWidth} from '../headless/sidebar-width'
import {SIDEBAR_LAYOUT} from '../headless/sidebar-layout'

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
  const initial = untrack(() => props.initialWidth ?? SIDEBAR_LAYOUT.initial)
  const [preferred, setPreferred] = createSignal(initial)
  const [drag, setDrag] = createSignal<PointerDrag | null>(null)
  const constrain = (preferred: number) =>
    sidebarWidth({
      available: props.availableWidth(),
      contentMinimum: props.contentMinimum(),
      initial,
      minimum: props.minimum(),
      preferred,
      spacing: props.spacing(),
    })
  const maximum = createMemo(() => constrain(initial).maximum)
  const clamp = (value: number): number => constrain(value).width
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
        setPreferred(clamp(current + SIDEBAR_LAYOUT.keyboardStep))
        return true
      case 'ArrowRight':
        setPreferred(clamp(current - SIDEBAR_LAYOUT.keyboardStep))
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
