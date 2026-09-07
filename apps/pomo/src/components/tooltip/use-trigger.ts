import {createSignal, type JSX, onCleanup} from 'solid-js'

const OPEN_DELAY = 400

export const useTooltipTrigger = () => {
  const [target, setTarget] = createSignal<HTMLElement>()
  // Reissue hover requests after the provider dismisses a tooltip.
  const [show, setShow] = createSignal(false, {equals: false})
  let visibleFocus = false
  let timer: ReturnType<typeof setTimeout> | undefined
  const cancel = () => {
    clearTimeout(timer)
    timer = undefined
  }
  const events = {
    onBlur: () => {
      visibleFocus = false
      cancel()
      setShow(false)
    },
    onFocus: ((event) => {
      visibleFocus = event.currentTarget.matches(':focus-visible')
      if (visibleFocus) {
        cancel()
        setShow(true)
      }
    }) satisfies JSX.EventHandler<HTMLElement, FocusEvent>,
    onPointerDown: () => {
      visibleFocus = false
      cancel()
      setShow(false)
    },
    onPointerEnter: ((event) => {
      if (event.pointerType === 'touch') {
        return
      }
      cancel()
      if (visibleFocus) {
        setShow(true)
        return
      }
      timer = setTimeout(() => {
        timer = undefined
        setShow(true)
      }, OPEN_DELAY)
    }) satisfies JSX.EventHandler<HTMLElement, PointerEvent>,
    onPointerLeave: () => {
      cancel()
      if (!visibleFocus) {
        setShow(false)
      }
    },
  }
  onCleanup(cancel)
  return {events, setTarget, show, target}
}
