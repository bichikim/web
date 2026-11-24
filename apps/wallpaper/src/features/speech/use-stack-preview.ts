import {type Accessor, batch, createEffect, createSignal, onCleanup} from 'solid-js'
import {useSpeechHover} from './use-speech-hover'

interface UseStackPreviewProps {
  readonly busy: Accessor<boolean>
  readonly element?: Accessor<HTMLElement | null>
}
const IDLE_DELAY = 3000
const LEAVE_DELAY = 200

/** Reveals rear cards during interaction without changing selection or stack geometry. */
export const useStackPreview = (props: UseStackPreviewProps) => {
  const [expanded, setExpanded] = createSignal(false)
  const [inside, setInside] = createSignal(false)
  const [pressed, setPressed] = createSignal(false)
  const [focused, setFocused] = createSignal(false)
  const [activity, setActivity] = createSignal(0)
  const reveal = () => {
    setExpanded(true)
    setActivity((value) => value + 1)
  }
  const enter = () =>
    batch(() => {
      setInside(true)
      reveal()
    })
  const leave = () => setInside(false)
  useSpeechHover({element: () => props.element?.() ?? null, onLeave: leave, onMove: enter})
  const press = () =>
    batch(() => {
      setPressed(true)
      reveal()
    })
  const release = () => setPressed(false)
  const focus = (event: FocusEvent) => {
    if (event.target instanceof Element && event.target.matches(':focus-visible')) {
      setFocused(true)
      reveal()
    }
  }
  const blur = (event: FocusEvent & {currentTarget: HTMLElement}) => {
    if (
      !(event.relatedTarget instanceof Node) ||
      !event.currentTarget.contains(event.relatedTarget)
    ) {
      setFocused(false)
    }
  }
  const keyboard = () =>
    batch(() => {
      setFocused(true)
      reveal()
    })
  const deactivate = () =>
    batch(() => {
      setInside(false)
      setPressed(false)
      setFocused(false)
    })
  createEffect(() => {
    const busy = props.busy() || pressed() || focused()
    const hovering = inside()
    const visible = expanded()
    activity()
    if (busy) {
      setExpanded(true)
      return
    }
    if (visible) {
      const timer = setTimeout(() => setExpanded(false), hovering ? IDLE_DELAY : LEAVE_DELAY)
      onCleanup(() => clearTimeout(timer))
    }
  })
  createEffect(() => {
    if (typeof globalThis.addEventListener !== 'function') {
      return
    }
    // Release can occur outside the list or on an ancestor holding pointer capture.
    globalThis.addEventListener('pointerup', release)
    globalThis.addEventListener('pointercancel', release)
    globalThis.addEventListener('blur', deactivate)
    onCleanup(() => {
      globalThis.removeEventListener('pointerup', release)
      globalThis.removeEventListener('pointercancel', release)
      globalThis.removeEventListener('blur', deactivate)
    })
  })
  return {blur, enter, expanded, focus, keyboard, leave, move: enter, press}
}
