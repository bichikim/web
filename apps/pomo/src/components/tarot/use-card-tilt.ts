import {createSignal, type JSX, onCleanup, onMount} from 'solid-js'
import {clamp} from 'es-toolkit/math'
import {releaseCapturedPointer} from 'src/utils/release-captured-pointer'
import {exponentialApproachFactor} from 'src/utils/exponential-approach-factor'

interface CardTiltOffset {
  readonly x: number
  readonly y: number
}

interface CardTiltDrag {
  readonly host: HTMLDivElement
  readonly offset: CardTiltOffset
  readonly pointerId: number
  readonly x: number
  readonly y: number
}

const MAXIMUM_FRAME_DURATION = 64
const FRAME_DURATION_FALLBACK = 16
const FOLLOW_TIME_CONSTANT = 100
const SETTLE_DISTANCE = 0.002
const DRAG_RANGE_RATIO = 0.35
const KEYBOARD_STEP = 0.25

const CENTER = {x: 0, y: 0} as const

/** Tracks bounded card tilt from dragging or arrow keys. */
export const useCardTilt = () => {
  const [offset, setOffset] = createSignal<CardTiltOffset>(CENTER)
  const [isReducedMotion, setIsReducedMotion] = createSignal(false)
  let target: CardTiltOffset = CENTER
  let frame: number | null = null
  let lastTime: number | null = null
  let drag: CardTiltDrag | null = null

  const renderFrame = (time: number) => {
    frame = null
    const easing = exponentialApproachFactor(
      Math.min(MAXIMUM_FRAME_DURATION, time - (lastTime ?? time - FRAME_DURATION_FALLBACK)),
      FOLLOW_TIME_CONSTANT,
    )
    lastTime = time
    const current = offset()
    const next = {
      x: current.x + (target.x - current.x) * easing,
      y: current.y + (target.y - current.y) * easing,
    }
    const moving = Math.abs(next.x - target.x) + Math.abs(next.y - target.y) > SETTLE_DISTANCE
    setOffset(moving ? next : target)
    if (moving) {
      frame = globalThis.requestAnimationFrame(renderFrame)
    } else {
      lastTime = null
    }
  }
  const setTarget = (x: number, y: number) => {
    if (isReducedMotion()) {
      return
    }
    target = {x: clamp(x, -1, 1), y: clamp(y, -1, 1)}
    if (frame === null) {
      frame = globalThis.requestAnimationFrame(renderFrame)
    }
  }
  const reset = () => {
    target = CENTER
    if (frame !== null) {
      globalThis.cancelAnimationFrame(frame)
      frame = null
    }
    lastTime = null
    setOffset(CENTER)
  }
  const endDrag = () => {
    const current = drag
    drag = null
    if (current !== null) {
      releaseCapturedPointer(current.host, current.pointerId)
    }
    setTarget(0, 0)
  }
  const handlePointerDown: JSX.EventHandler<HTMLDivElement, PointerEvent> = (event) => {
    if (event.button !== 0 || isReducedMotion() || drag !== null) {
      return
    }
    drag = {
      host: event.currentTarget,
      offset: offset(),
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    }
    event.currentTarget.setPointerCapture?.(event.pointerId)
    event.currentTarget.focus({preventScroll: true})
    event.preventDefault()
  }
  const handlePointerMove: JSX.EventHandler<HTMLDivElement, PointerEvent> = (event) => {
    const current = drag
    if (current === null || current.pointerId !== event.pointerId || isReducedMotion()) {
      return
    }
    const bounds = event.currentTarget.getBoundingClientRect()
    if (bounds.width === 0 || bounds.height === 0) {
      return
    }
    setTarget(
      current.offset.x - (event.clientX - current.x) / (bounds.width * DRAG_RANGE_RATIO),
      current.offset.y - (event.clientY - current.y) / (bounds.height * DRAG_RANGE_RATIO),
    )
    event.preventDefault()
  }
  const handlePointerUp: JSX.EventHandler<HTMLDivElement, PointerEvent> = (event) => {
    if (drag?.pointerId === event.pointerId) {
      endDrag()
    }
  }
  const handlePointerLeave = () => {
    if (drag === null) {
      setTarget(0, 0)
    }
  }
  const handleKeyDown: JSX.EventHandler<HTMLDivElement, KeyboardEvent> = (event) => {
    switch (event.key) {
      case 'ArrowLeft':
        setTarget(target.x - KEYBOARD_STEP, target.y)
        break
      case 'ArrowRight':
        setTarget(target.x + KEYBOARD_STEP, target.y)
        break
      case 'ArrowUp':
        setTarget(target.x, target.y - KEYBOARD_STEP)
        break
      case 'ArrowDown':
        setTarget(target.x, target.y + KEYBOARD_STEP)
        break
      case 'Home':
        setTarget(0, 0)
        break
      default:
        return
    }
    event.preventDefault()
    event.stopPropagation()
  }

  onMount(() => {
    const preference = globalThis.matchMedia('(prefers-reduced-motion: reduce)')
    const handlePreference = () => {
      setIsReducedMotion(preference.matches)
      if (preference.matches) {
        endDrag()
        reset()
      }
    }
    handlePreference()
    preference.addEventListener('change', handlePreference)
    onCleanup(() => preference.removeEventListener('change', handlePreference))
  })
  onCleanup(() => {
    endDrag()
    reset()
  })

  return {
    handleKeyDown,
    handlePointerDown,
    handlePointerLeave,
    handlePointerMove,
    handlePointerUp,
    offset,
  }
}
