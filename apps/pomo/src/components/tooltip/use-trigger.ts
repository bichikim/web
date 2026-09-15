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
  const onBlur = () => {
    visibleFocus = false
    cancel()
    setShow(false)
  }
  const onFocus = ((event) => {
    visibleFocus = event.currentTarget.matches(':focus-visible')
    if (visibleFocus) {
      cancel()
      setShow(true)
    }
  }) satisfies JSX.EventHandler<HTMLElement, FocusEvent>
  const onPointerDown = () => {
    visibleFocus = false
    cancel()
    setShow(false)
  }
  const onPointerEnter = ((event) => {
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
  }) satisfies JSX.EventHandler<HTMLElement, PointerEvent>
  const onPointerLeave = () => {
    cancel()
    if (!visibleFocus) {
      setShow(false)
    }
  }
  onCleanup(cancel)
  return {onBlur, onFocus, onPointerDown, onPointerEnter, onPointerLeave, setTarget, show, target}
}
