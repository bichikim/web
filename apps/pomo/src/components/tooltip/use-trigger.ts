import {createSignal, type JSX, onCleanup} from 'solid-js'

const OPEN_DELAY = 400

export const useTooltipTrigger = () => {
  const [target, setTarget] = createSignal<HTMLElement>()
  const [show, setShow] = createSignal(false)
  let timer: ReturnType<typeof setTimeout> | undefined
  let focused = false
  let pointerFocus = false
  const cancel = () => {
    clearTimeout(timer)
    timer = undefined
  }
  const events = {
    onBlur: () => {
      pointerFocus = false
      focused = false
      cancel()
      setShow(false)
    },
    onFocus: () => {
      if (!pointerFocus) {
        focused = true
        cancel()
        setShow(true)
      }
    },
    onPointerDown: () => {
      pointerFocus = true
      cancel()
      setShow(false)
    },
    onPointerEnter: ((event) => {
      if (event.pointerType === 'touch' || focused) {
        return
      }
      cancel()
      timer = setTimeout(() => {
        timer = undefined
        setShow(true)
      }, OPEN_DELAY)
    }) satisfies JSX.EventHandler<HTMLElement, PointerEvent>,
    onPointerLeave: () => {
      cancel()
      if (!focused) {
        setShow(false)
      }
    },
  }
  onCleanup(cancel)
  return {events, setTarget, show, target}
}
