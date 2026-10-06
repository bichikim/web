import {observeReducedMotionPreference} from 'src/utils/observe-media-query'
import {getDragDepthOffset} from 'src/utils/get-drag-depth-offset'
import {createAnimationLoop} from '@winter-love/solid-use/animation-loop'
import {
  getCalibratedOrientation,
  getOrientationOffset,
  hasDeviceOrientation,
  type OrientationReference,
  readDeviceOrientationRuntime,
  requestDeviceOrientationPermission,
  requiresDeviceOrientationPermission,
} from 'src/features/device-orientation'
import {exponentialApproachFactor} from 'src/utils/exponential-approach-factor'
import {createEffect, createSignal, type JSX, onCleanup} from 'solid-js'
import {clamp} from 'es-toolkit/math'

import {releaseCapturedPointer} from 'src/utils/release-captured-pointer'
import type {RelaxDepthInput, RelaxDepthOffset, RelaxDepthStatus} from './types'

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
  const animation = createAnimationLoop()
  let running = false
  let lastFrameTime: number | null = null

  const renderFrame = (time: number) => {
    const duration = Math.min(
      MAXIMUM_FRAME_DURATION,
      Math.max(0, time - (lastFrameTime ?? time - FRAME_DURATION_FALLBACK)),
    )
    lastFrameTime = time
    const easing = exponentialApproachFactor(duration, FOLLOW_TIME_CONSTANT)
    const current = offset()
    const next = {
      x: current.x + (target.x - current.x) * easing,
      y: current.y + (target.y - current.y) * easing,
    }
    const unsettled =
      Math.abs(next.x - target.x) > PARALLAX_SETTLE_DISTANCE ||
      Math.abs(next.y - target.y) > PARALLAX_SETTLE_DISTANCE
    setOffset(unsettled ? next : target)
    if (!unsettled) {
      animation.stop()
      running = false
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
    if (!running) {
      running = true
      animation.start((time) => {
        try {
          renderFrame(time)
        } catch (error) {
          animation.stop()
          running = false
          throw error
        }
      })
    }
  }

  const reset = () => {
    target = ZERO_OFFSET
    animation.stop()
    running = false
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
    setTarget(
      getDragDepthOffset({
        distance: event.clientX - drag.startX,
        extent: bounds.width,
        startOffset: drag.startOffset.x,
      }),
      getDragDepthOffset({
        distance: event.clientY - drag.startY,
        extent: bounds.height,
        startOffset: drag.startOffset.y,
      }),
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

const useDepthMotionPreference = (onChange: (matches: boolean) => void) => {
  let preference: MediaQueryList | undefined
  createEffect(() => {
    const matchMedia = globalThis.matchMedia?.bind(globalThis)
    const unsubscribe = observeReducedMotionPreference(onChange, {
      matchMedia:
        matchMedia === undefined
          ? undefined
          : (query) => {
              preference = matchMedia(query)
              return preference
            },
    })
    onCleanup(() => {
      unsubscribe?.()
      preference = undefined
    })
  })
  return () => preference?.matches ?? false
}

/** Tracks background depth motion from a captured drag or calibrated device tilt. */
export const useRelaxDepthMotion = () => {
  const [inputMode, setMode] = createSignal<RelaxDepthInput>('drag')
  const [status, setStatus] = createSignal<RelaxDepthStatus>('ready')
  let orientationReference: OrientationReference | null = null
  let requestVersion = 0
  const isReducedMotion = useDepthMotionPreference((matches) => {
    if (matches) {
      disableMotionForReducedPreference()
    } else {
      setStatus('ready')
    }
  })
  const {offset, reset, setTarget} = createDepthOffsetSmoother(isReducedMotion)
  const {endDrag, onPointerDown, onPointerMove, onPointerUp} = createDepthDragController(
    offset,
    setTarget,
    () => inputMode() === 'drag' && !isReducedMotion(),
  )
  const cancelDrag = () => {
    endDrag()
    reset()
  }
  const disableMotionForReducedPreference = () => {
    requestVersion += 1
    endDrag()
    orientationReference = null
    reset()
    setMode('drag')
    setStatus('reduced-motion')
  }

  const handleOrientation = (event: DeviceOrientationEvent) => {
    if (inputMode() !== 'gyroscope' || isReducedMotion() || globalThis.document.hidden) {
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

  const activateGyroscope = async (version: number) => {
    if (isReducedMotion()) {
      disableMotionForReducedPreference()
      return
    }
    const runtime = readDeviceOrientationRuntime()
    if (!hasDeviceOrientation(runtime)) {
      setStatus('unavailable')
      return
    }
    if (requiresDeviceOrientationPermission(runtime)) {
      setStatus('requesting')
    }
    try {
      const permissionRequest = requestDeviceOrientationPermission(runtime)
      const permission =
        typeof permissionRequest === 'string' ? permissionRequest : await permissionRequest
      if (version !== requestVersion) {
        return
      }
      if (isReducedMotion()) {
        disableMotionForReducedPreference()
        return
      }
      if (permission !== 'granted') {
        setStatus(permission)
        return
      }
    } catch {
      if (version === requestVersion) {
        if (isReducedMotion()) {
          disableMotionForReducedPreference()
        } else {
          setStatus('denied')
        }
      }
      return
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
    if (isReducedMotion()) {
      disableMotionForReducedPreference()
      return
    }
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
