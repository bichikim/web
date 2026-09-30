import {createEffect, createSignal, type JSX, onCleanup} from 'solid-js'
import {clamp} from 'es-toolkit/math'

import {
  getCalibratedOrientation,
  getOrientationOffset,
  type OrientationReference,
} from 'src/features/device-orientation'
import {releaseCapturedPointer} from 'src/utils/release-captured-pointer'
import type {RelaxDepthInput, RelaxDepthOffset, RelaxDepthStatus} from './types'

const DRAG_RANGE_RATIO = 0.35
const FRAME_DURATION_FALLBACK = 16
const FOLLOW_TIME_CONSTANT = 180
const MAXIMUM_FRAME_DURATION = 64
const PARALLAX_SETTLE_DISTANCE = 0.002
const ZERO_OFFSET = {x: 0, y: 0} as const

interface ActiveDrag {
  readonly host: HTMLDivElement
  readonly pointerId: number
  readonly startOffset: RelaxDepthOffset
  readonly startX: number
  readonly startY: number
}

const createDepthOffsetSmoother = (isReducedMotion: () => boolean) => {
  const [offset, setOffset] = createSignal<RelaxDepthOffset>(ZERO_OFFSET)
  let target: RelaxDepthOffset = ZERO_OFFSET
  let frame: number | null = null
  let lastFrameTime: number | null = null

  const renderFrame = (time: number) => {
    frame = null
    const duration = Math.min(
      MAXIMUM_FRAME_DURATION,
      Math.max(0, time - (lastFrameTime ?? time - FRAME_DURATION_FALLBACK)),
    )
    lastFrameTime = time
    const easing = 1 - Math.exp(-duration / FOLLOW_TIME_CONSTANT)
    const current = offset()
    const next = {
      x: current.x + (target.x - current.x) * easing,
      y: current.y + (target.y - current.y) * easing,
    }
    const unsettled =
      Math.abs(next.x - target.x) > PARALLAX_SETTLE_DISTANCE ||
      Math.abs(next.y - target.y) > PARALLAX_SETTLE_DISTANCE
    setOffset(unsettled ? next : target)
    if (unsettled) {
      frame = globalThis.requestAnimationFrame(renderFrame)
    } else {
      lastFrameTime = null
    }
  }

  const setTarget = (x: number, y: number) => {
    target = {x: clamp(x, -1, 1), y: clamp(y, -1, 1)}
    if (isReducedMotion()) {
      return
    }
    if (typeof globalThis.requestAnimationFrame !== 'function') {
      setOffset(target)
      return
    }
    if (frame === null) {
      frame = globalThis.requestAnimationFrame(renderFrame)
    }
  }

  const reset = () => {
    target = ZERO_OFFSET
    if (frame !== null) {
      globalThis.cancelAnimationFrame(frame)
      frame = null
    }
    lastFrameTime = null
    setOffset(ZERO_OFFSET)
  }

  return {offset, reset, setTarget}
}

const createDepthDragController = (
  offset: () => RelaxDepthOffset,
  setTarget: (x: number, y: number) => void,
  canDrag: () => boolean,
) => {
  let activeDrag: ActiveDrag | null = null

  const endDrag = () => {
    const drag = activeDrag
    if (drag === null) {
      return
    }
    activeDrag = null
    releaseCapturedPointer(drag.host, drag.pointerId)
    setTarget(0, 0)
  }

  const onPointerDown: JSX.EventHandler<HTMLDivElement, PointerEvent> = (event) => {
    if (event.button !== 0 || activeDrag !== null || !canDrag()) {
      return
    }
    activeDrag = {
      host: event.currentTarget,
      pointerId: event.pointerId,
      startOffset: offset(),
      startX: event.clientX,
      startY: event.clientY,
    }
    event.currentTarget.setPointerCapture?.(event.pointerId)
    event.preventDefault()
  }

  const onPointerMove: JSX.EventHandler<HTMLDivElement, PointerEvent> = (event) => {
    const drag = activeDrag
    if (drag === null || drag.pointerId !== event.pointerId || !canDrag()) {
      return
    }
    const bounds = drag.host.getBoundingClientRect()
    if (bounds.width === 0 || bounds.height === 0) {
      return
    }
    const horizontal = (event.clientX - drag.startX) / bounds.width
    const vertical = (event.clientY - drag.startY) / bounds.height
    setTarget(
      drag.startOffset.x - horizontal / DRAG_RANGE_RATIO,
      drag.startOffset.y - vertical / DRAG_RANGE_RATIO,
    )
    event.preventDefault()
  }

  const onPointerUp: JSX.EventHandler<HTMLDivElement, PointerEvent> = (event) => {
    if (activeDrag?.pointerId === event.pointerId) {
      endDrag()
    }
  }

  return {endDrag, onPointerDown, onPointerMove, onPointerUp}
}

/** Tracks background depth motion from a captured drag or calibrated device tilt. */
export const useRelaxDepthMotion = () => {
  const [inputMode, setMode] = createSignal<RelaxDepthInput>('drag')
  const [status, setStatus] = createSignal<RelaxDepthStatus>('ready')
  let orientationReference: OrientationReference | null = null
  let requestVersion = 0
  let reducedMotion = false
  const {offset, reset, setTarget} = createDepthOffsetSmoother(() => reducedMotion)
  const {endDrag, onPointerDown, onPointerMove, onPointerUp} = createDepthDragController(
    offset,
    setTarget,
    () => inputMode() === 'drag' && !reducedMotion,
  )
  const cancelDrag = () => {
    endDrag()
    reset()
  }

  const handleOrientation = (event: DeviceOrientationEvent) => {
    if (inputMode() !== 'gyroscope' || reducedMotion || globalThis.document.hidden) {
      return
    }
    const movement = getCalibratedOrientation(
      event.beta,
      event.gamma,
      globalThis.screen.orientation?.angle ?? 0,
      orientationReference,
    )
    if (movement === null) {
      return
    }
    orientationReference = movement.reference
    const offset = getOrientationOffset(movement.axes, movement.reference.axes)
    setTarget(offset.x, offset.y)
    setStatus('active')
  }

  createEffect(() => {
    if (inputMode() !== 'gyroscope') {
      return
    }
    globalThis.addEventListener('deviceorientation', handleOrientation)
    onCleanup(() => globalThis.removeEventListener('deviceorientation', handleOrientation))
  })

  createEffect(() => {
    const preference = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (preference === undefined) {
      return
    }
    const handleChange = () => {
      reducedMotion = preference.matches
      if (reducedMotion) {
        endDrag()
        reset()
      }
    }
    handleChange()
    preference.addEventListener('change', handleChange)
    onCleanup(() => preference.removeEventListener('change', handleChange))
  })

  const activateGyroscope = async (version: number) => {
    const orientation = globalThis.DeviceOrientationEvent
    if (orientation === undefined || globalThis.isSecureContext === false) {
      setStatus('unavailable')
      return
    }
    if ('requestPermission' in orientation && typeof orientation.requestPermission === 'function') {
      setStatus('requesting')
      try {
        const permission = await orientation.requestPermission()
        if (version !== requestVersion) {
          return
        }
        if (permission !== 'granted') {
          setStatus('denied')
          return
        }
      } catch {
        if (version === requestVersion) {
          setStatus('denied')
        }
        return
      }
    }
    if (version !== requestVersion) {
      return
    }
    endDrag()
    orientationReference = null
    reset()
    setStatus('waiting')
    setMode('gyroscope')
  }

  const setInputMode = (mode: RelaxDepthInput) => {
    requestVersion += 1
    if (mode === 'gyroscope') {
      const version = requestVersion
      activateGyroscope(version).catch(() => {
        if (version === requestVersion) {
          setStatus('unavailable')
        }
      })
      return
    }
    endDrag()
    orientationReference = null
    reset()
    setStatus('ready')
    setMode('drag')
  }

  onCleanup(() => {
    requestVersion += 1
    endDrag()
    reset()
  })

  return {
    cancelDrag,
    inputMode,
    offset,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    setInputMode,
    status,
  }
}
