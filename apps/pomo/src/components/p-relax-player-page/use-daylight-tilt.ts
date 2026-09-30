import {type Accessor, createEffect, createMemo, createSignal, onCleanup} from 'solid-js'

import type {VirtualLightPosition} from 'src/features/relax-glass-renderer'
import {getCalibratedOrientation, type OrientationReference} from 'src/features/device-orientation'

const MAX_TILT_DEGREES = 30
const MAX_HORIZONTAL_OFFSET = 0.08
const MAX_VERTICAL_OFFSET = 0.06
const SMOOTHING_FACTOR = 0.25
const LANDSCAPE_PRIMARY_ANGLE = 90
const LANDSCAPE_SECONDARY_ANGLE = 270
const ZERO_OFFSET = {x: 0, y: 0} as const

export type DaylightTiltStatus =
  | 'off'
  | 'requesting'
  | 'waiting'
  | 'active'
  | 'denied'
  | 'unavailable'

interface TiltOffset {
  readonly x: number
  readonly y: number
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value))

/** Adds a small calibrated device-tilt offset to a manually selected light position. */
export const useDaylightTilt = (basePosition: Accessor<VirtualLightPosition>) => {
  const [status, setStatus] = createSignal<DaylightTiltStatus>('off')
  const [listening, setListening] = createSignal(false)
  const [offset, setOffset] = createSignal<TiltOffset>(ZERO_OFFSET)
  let reference: OrientationReference | null = null
  let requestVersion = 0

  const handleOrientation = (event: DeviceOrientationEvent) => {
    const angle = globalThis.screen.orientation?.angle ?? 0
    const movement = getCalibratedOrientation(event.beta, event.gamma, angle, reference)
    if (movement === null) {
      return
    }
    const recalibrated = reference === null || reference.angle !== angle
    const {delta, reference: nextReference} = movement
    reference = nextReference
    if (recalibrated) {
      setOffset(ZERO_OFFSET)
      setStatus('active')
      return
    }
    const direction =
      angle === LANDSCAPE_PRIMARY_ANGLE || angle === LANDSCAPE_SECONDARY_ANGLE ? -1 : 1
    const horizontal = delta.x * direction
    const vertical = delta.y * direction
    const target = {
      x: clamp(horizontal / MAX_TILT_DEGREES, -1, 1) * MAX_HORIZONTAL_OFFSET,
      y: clamp(vertical / MAX_TILT_DEGREES, -1, 1) * MAX_VERTICAL_OFFSET,
    }
    setOffset((current) => ({
      x: current.x + (target.x - current.x) * SMOOTHING_FACTOR,
      y: current.y + (target.y - current.y) * SMOOTHING_FACTOR,
    }))
  }

  createEffect(() => {
    if (!listening()) {
      return
    }
    globalThis.addEventListener('deviceorientation', handleOrientation)
    onCleanup(() => globalThis.removeEventListener('deviceorientation', handleOrientation))
  })

  onCleanup(() => {
    requestVersion += 1
  })

  const disable = () => {
    requestVersion += 1
    setListening(false)
    reference = null
    setOffset(ZERO_OFFSET)
    setStatus('off')
  }

  const enable = async () => {
    requestVersion += 1
    const currentRequest = requestVersion
    if (typeof DeviceOrientationEvent === 'undefined' || globalThis.isSecureContext === false) {
      setStatus('unavailable')
      return
    }

    setStatus('requesting')
    try {
      if (
        'requestPermission' in DeviceOrientationEvent &&
        typeof DeviceOrientationEvent.requestPermission === 'function'
      ) {
        const permission = await DeviceOrientationEvent.requestPermission()
        if (currentRequest !== requestVersion) {
          return
        }
        if (permission !== 'granted') {
          setStatus('denied')
          return
        }
      }
      reference = null
      setOffset(ZERO_OFFSET)
      setStatus('waiting')
      setListening(true)
    } catch {
      if (currentRequest === requestVersion) {
        setStatus('denied')
      }
    }
  }

  const setEnabled = (enabled: boolean) => {
    if (enabled) {
      return enable()
    }
    disable()
  }

  const position = createMemo(() => {
    const base = basePosition()
    const tilt = offset()
    return {
      ...base,
      x: clamp(base.x + tilt.x, 0, 1),
      y: clamp(base.y + tilt.y, 0, 1),
    }
  })

  const enabled = () => {
    const currentStatus = status()
    return (
      currentStatus === 'requesting' || currentStatus === 'waiting' || currentStatus === 'active'
    )
  }

  return {enabled, position, setEnabled, status}
}
