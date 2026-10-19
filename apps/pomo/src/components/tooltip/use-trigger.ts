import {createSignal, type JSX} from 'solid-js'
import {createTimeout} from '@winter-love/solid-use/timeout'

const OPEN_DELAY = 400

export const useTooltipTrigger = () => {
  const [target, setTarget] = createSignal<HTMLElement>()
  // Reissue hover requests after the provider dismisses a tooltip.
  const [show, setShow] = createSignal(false, {equals: false})
  let visibleFocus = false
  const {cancel, execute: scheduleOpen} = createTimeout(() => setShow(true), OPEN_DELAY)
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
    if (visibleFocus) {
      cancel()
      setShow(true)
      return
    }
    scheduleOpen()
  }) satisfies JSX.EventHandler<HTMLElement, PointerEvent>
  const onPointerLeave = () => {
    cancel()
    if (!visibleFocus) {
      setShow(false)
    }
  }
  const triggerProps = {
    onBlur,
    onFocus,
    onPointerDown,
    onPointerEnter,
    onPointerLeave,
    ref: setTarget,
  }
  return {
    onBlur,
    onFocus,
    onPointerDown,
    onPointerEnter,
    onPointerLeave,
    setTarget,
    show,
    target,
    triggerProps,
  }
}
