const PARALLAX_EASING = 0.12
const PARALLAX_MAXIMUM_X = 9
const PARALLAX_MAXIMUM_Y = 6
const PARALLAX_SETTLE_DISTANCE = 0.01
const DEVICE_ORIENTATION_RANGE_X = 18
const DEVICE_ORIENTATION_RANGE_Y = 14
const DEVICE_ORIENTATION_DEAD_ZONE = 0.025
const SCREEN_ANGLE_LANDSCAPE_PRIMARY = 90
const SCREEN_ANGLE_PORTRAIT_SECONDARY = 180
const SCREEN_ANGLE_LANDSCAPE_SECONDARY = 270
const FULL_ROTATION_DEGREES = 360

type RenderOffset = (x: number, y: number) => void

const clamp = (value: number) => Math.max(-1, Math.min(1, value))
const removeDeadZone = (value: number) =>
  Math.abs(value) < DEVICE_ORIENTATION_DEAD_ZONE ? 0 : value

interface OrientationAxes {
  readonly x: number
  readonly y: number
}

interface DeviceOrientationPermissionApi {
  requestPermission?: () => Promise<'denied' | 'granted' | 'prompt'>
}

const getScreenAngle = () => {
  const angle = globalThis.screen.orientation?.angle ?? globalThis.orientation ?? 0

  return ((angle % FULL_ROTATION_DEGREES) + FULL_ROTATION_DEGREES) % FULL_ROTATION_DEGREES
}

const getOrientationAxes = (event: DeviceOrientationEvent): OrientationAxes | null => {
  const {beta, gamma} = event

  if (beta === null || gamma === null) {
    return null
  }

  const screenAngle = getScreenAngle()

  switch (screenAngle) {
    case 0:
      return {x: gamma, y: beta}
    case SCREEN_ANGLE_LANDSCAPE_PRIMARY:
      return {x: beta, y: -gamma}
    case SCREEN_ANGLE_PORTRAIT_SECONDARY:
      return {x: -gamma, y: -beta}
    case SCREEN_ANGLE_LANDSCAPE_SECONDARY:
      return {x: -beta, y: gamma}
    default:
      return {x: gamma, y: beta}
  }
}

export class ParallaxController {
  readonly #host: HTMLElement
  readonly #motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
  readonly #preferDeviceOrientation =
    window.matchMedia('(hover: none) and (pointer: coarse)').matches &&
    'DeviceOrientationEvent' in window
  readonly #renderOffset: RenderOffset
  readonly #handleDeviceOrientation = (event: DeviceOrientationEvent) => {
    if (this.#motionPreference.matches) {
      return
    }

    const axes = getOrientationAxes(event)

    if (axes === null) {
      return
    }

    if (this.#orientationBaseline === null) {
      this.#orientationBaseline = axes
      return
    }

    const horizontalTilt = removeDeadZone(
      clamp((axes.x - this.#orientationBaseline.x) / DEVICE_ORIENTATION_RANGE_X),
    )
    const verticalTilt = removeDeadZone(
      clamp((axes.y - this.#orientationBaseline.y) / DEVICE_ORIENTATION_RANGE_Y),
    )
    this.#targetX = horizontalTilt * PARALLAX_MAXIMUM_X
    this.#targetY = verticalTilt * PARALLAX_MAXIMUM_Y
    this.#requestFrame()
  }
  readonly #handleMotionPreference = () => {
    if (this.#motionPreference.matches) {
      this.#reset(true)
    }
  }
  readonly #handleOrientationChange = () => {
    this.#orientationBaseline = null
    this.#reset()
  }
  readonly #handleSensorActivation = () => {
    this.#requestDeviceOrientation().catch(() => this.#startPointerInput())
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
    window.addEventListener('blur', this.#handlePointerLeave)
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
    window.removeEventListener('blur', this.#handlePointerLeave)
    window.removeEventListener('orientationchange', this.#handleOrientationChange)
    window.removeEventListener('pointermove', this.#handlePointerMove)
    document.documentElement.removeEventListener('pointerleave', this.#handlePointerLeave)
    globalThis.screen.orientation?.removeEventListener('change', this.#handleOrientationChange)
    this.#motionPreference.removeEventListener('change', this.#handleMotionPreference)

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
  }

  #startPointerInput() {
    if (this.#pointerListening || this.#destroyed) {
      return
    }

    this.#pointerListening = true
    window.addEventListener('pointermove', this.#handlePointerMove, {passive: true})
    document.documentElement.addEventListener('pointerleave', this.#handlePointerLeave)
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
