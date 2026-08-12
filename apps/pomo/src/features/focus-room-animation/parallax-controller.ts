import {getOrientationAxes, getOrientationOffset, type OrientationAxes} from './device-orientation'

const PARALLAX_EASING = 0.12
const PARALLAX_MAXIMUM_X = 9
const PARALLAX_MAXIMUM_Y = 6
const PARALLAX_SETTLE_DISTANCE = 0.01
const FULL_ROTATION_DEGREES = 360
const SENSOR_FALLBACK_DELAY = 1_500

type RenderOffset = (x: number, y: number) => void

const clamp = (value: number) => Math.max(-1, Math.min(1, value))

interface DeviceOrientationPermissionApi {
  requestPermission?: () => Promise<'denied' | 'granted' | 'prompt'>
}

const getScreenAngle = () => {
  const angle = globalThis.screen.orientation?.angle ?? globalThis.orientation ?? 0

  return ((angle % FULL_ROTATION_DEGREES) + FULL_ROTATION_DEGREES) % FULL_ROTATION_DEGREES
}

export class ParallaxController {
  readonly #host: HTMLElement
  readonly #motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
  readonly #preferDeviceOrientation =
    window.matchMedia('(hover: none) and (pointer: coarse)').matches &&
    'DeviceOrientationEvent' in window
  readonly #renderOffset: RenderOffset
  readonly #handleDeviceOrientation = (event: DeviceOrientationEvent) => {
    if (this.#motionPreference.matches || document.hidden) {
      return
    }

    const axes = getOrientationAxes(event.beta, event.gamma, getScreenAngle())

    if (axes === null) {
      return
    }

    if (this.#orientationBaseline === null) {
      this.#clearSensorFallback()
      this.#stopPointerInput()
      this.#orientationBaseline = axes
      this.#reset()
      return
    }

    const offset = getOrientationOffset(axes, this.#orientationBaseline)
    this.#targetX = offset.x * PARALLAX_MAXIMUM_X
    this.#targetY = offset.y * PARALLAX_MAXIMUM_Y
    this.#requestFrame()
  }
  readonly #handleMotionPreference = () => {
    this.#orientationBaseline = null
    this.#reset(true)
  }
  readonly #handleOrientationChange = () => {
    this.#orientationBaseline = null
    this.#reset()
  }
  readonly #handleVisibilityChange = () => {
    if (document.hidden) {
      this.#handleWindowBlur()
    }
  }
  readonly #handleSensorActivation = () => {
    this.#requestDeviceOrientation().catch(() => this.#startPointerInput())
  }
  readonly #handleWindowBlur = () => {
    this.#orientationBaseline = null
    this.#reset()
  }
  readonly #handlePointerLeave = () => {
    this.#reset()
  }
  readonly #handlePointerMove = (event: PointerEvent) => {
    if (this.#motionPreference.matches) {
      return
    }

    const bounds = this.#host.getBoundingClientRect()

    if (bounds.width === 0 || bounds.height === 0) {
      return
    }

    const horizontalPosition = clamp(((event.clientX - bounds.left) / bounds.width) * 2 - 1)
    const verticalPosition = clamp(((event.clientY - bounds.top) / bounds.height) * 2 - 1)
    this.#targetX = horizontalPosition * PARALLAX_MAXIMUM_X
    this.#targetY = verticalPosition * PARALLAX_MAXIMUM_Y
    this.#requestFrame()
  }
  #currentX = 0
  #currentY = 0
  #destroyed = false
  #deviceOrientationListening = false
  #frame: number | null = null
  #orientationBaseline: OrientationAxes | null = null
  #pointerListening = false
  #sensorFallbackTimer: number | null = null
  #started = false
  #targetX = 0
  #targetY = 0

  constructor(host: HTMLElement, renderOffset: RenderOffset) {
    this.#host = host
    this.#renderOffset = renderOffset
  }

  get prefersReducedMotion() {
    return this.#motionPreference.matches
  }

  start() {
    if (this.#destroyed || this.#started) {
      return
    }

    this.#started = true
    window.addEventListener('blur', this.#handleWindowBlur)
    document.addEventListener('visibilitychange', this.#handleVisibilityChange)
    this.#motionPreference.addEventListener('change', this.#handleMotionPreference)

    if (this.#preferDeviceOrientation) {
      const orientationEvent = DeviceOrientationEvent as typeof DeviceOrientationEvent &
        DeviceOrientationPermissionApi

      if (orientationEvent.requestPermission === undefined) {
        this.#startDeviceOrientation()
      } else {
        // AI_NOTE - iOS exposes motion permission only from a direct user gesture.
        window.addEventListener('pointerdown', this.#handleSensorActivation, {
          once: true,
          passive: true,
        })
      }
      return
    }

    this.#startPointerInput()
  }

  destroy() {
    if (this.#destroyed) {
      return
    }

    this.#destroyed = true
    window.removeEventListener('deviceorientation', this.#handleDeviceOrientation)
    window.removeEventListener('pointerdown', this.#handleSensorActivation)
    window.removeEventListener('blur', this.#handleWindowBlur)
    window.removeEventListener('orientationchange', this.#handleOrientationChange)
    window.removeEventListener('pointermove', this.#handlePointerMove)
    document.removeEventListener('visibilitychange', this.#handleVisibilityChange)
    document.documentElement.removeEventListener('pointerleave', this.#handlePointerLeave)
    globalThis.screen.orientation?.removeEventListener('change', this.#handleOrientationChange)
    this.#motionPreference.removeEventListener('change', this.#handleMotionPreference)
    this.#clearSensorFallback()

    if (this.#frame !== null) {
      window.cancelAnimationFrame(this.#frame)
      this.#frame = null
    }
  }

  async #requestDeviceOrientation() {
    const orientationEvent = DeviceOrientationEvent as typeof DeviceOrientationEvent &
      DeviceOrientationPermissionApi
    const permission = await orientationEvent.requestPermission?.()

    if (permission === 'granted') {
      this.#startDeviceOrientation()
      return
    }

    this.#startPointerInput()
  }

  #startDeviceOrientation() {
    if (this.#deviceOrientationListening || this.#destroyed) {
      return
    }

    this.#deviceOrientationListening = true
    window.addEventListener('deviceorientation', this.#handleDeviceOrientation, {passive: true})
    window.addEventListener('orientationchange', this.#handleOrientationChange, {passive: true})
    globalThis.screen.orientation?.addEventListener('change', this.#handleOrientationChange)
    this.#sensorFallbackTimer = window.setTimeout(
      () => this.#startPointerInput(),
      SENSOR_FALLBACK_DELAY,
    )
  }

  #startPointerInput() {
    if (this.#pointerListening || this.#destroyed) {
      return
    }

    this.#pointerListening = true
    window.addEventListener('pointermove', this.#handlePointerMove, {passive: true})
    document.documentElement.addEventListener('pointerleave', this.#handlePointerLeave)
  }

  #stopPointerInput() {
    if (!this.#pointerListening) {
      return
    }

    this.#pointerListening = false
    window.removeEventListener('pointermove', this.#handlePointerMove)
    document.documentElement.removeEventListener('pointerleave', this.#handlePointerLeave)
  }

  #clearSensorFallback() {
    if (this.#sensorFallbackTimer === null) {
      return
    }

    window.clearTimeout(this.#sensorFallbackTimer)
    this.#sensorFallbackTimer = null
  }

  #reset(immediate = false) {
    this.#targetX = 0
    this.#targetY = 0

    if (immediate) {
      if (this.#frame !== null) {
        window.cancelAnimationFrame(this.#frame)
        this.#frame = null
      }

      this.#currentX = 0
      this.#currentY = 0
      this.#renderOffset(0, 0)
      return
    }

    this.#requestFrame()
  }

  #requestFrame() {
    if (this.#frame !== null || this.#destroyed) {
      return
    }

    this.#frame = window.requestAnimationFrame(() => this.#renderFrame())
  }

  #renderFrame() {
    this.#frame = null
    const horizontalDistance = this.#targetX - this.#currentX
    const verticalDistance = this.#targetY - this.#currentY
    this.#currentX += horizontalDistance * PARALLAX_EASING
    this.#currentY += verticalDistance * PARALLAX_EASING
    this.#renderOffset(this.#currentX, this.#currentY)

    if (
      Math.abs(horizontalDistance) > PARALLAX_SETTLE_DISTANCE ||
      Math.abs(verticalDistance) > PARALLAX_SETTLE_DISTANCE
    ) {
      this.#requestFrame()
    }
  }
}
