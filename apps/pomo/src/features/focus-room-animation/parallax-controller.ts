import {getOrientationAxes, getOrientationOffset, type OrientationAxes} from './device-orientation'
import type {PSceneMotionInput} from './scene-motion'

const DRAG_RANGE_RATIO = 0.35
const DRAG_RETURN_DELAY = 150
const FOLLOW_TIME_CONSTANT = 180
const FULL_ROTATION_DEGREES = 360
const MAXIMUM_FRAME_DURATION = 64
const PARALLAX_SETTLE_DISTANCE = 0.01
const RETURN_TIME_CONSTANT = 320
const SENSOR_FALLBACK_DELAY = 1_500

type RenderOffset = (x: number, y: number) => void
type MotionInputChange = (input: PSceneMotionInput) => void
type MotionPreferenceChange = (prefersReducedMotion: boolean) => void

interface DeviceOrientationPermissionApi {
  requestPermission?: () => Promise<'denied' | 'granted' | 'prompt'>
}

export interface ParallaxControllerOptions {
  readonly inputMode?: PSceneMotionInput
  readonly onInputModeChange?: MotionInputChange
  readonly onMotionPreferenceChange?: MotionPreferenceChange
}

const clamp = (value: number) => Math.max(-1, Math.min(1, value))
const getFrameEasing = (duration: number, timeConstant: number) =>
  1 - Math.exp(-duration / timeConstant)

const getScreenAngle = () => {
  const angle = globalThis.screen.orientation?.angle ?? globalThis.orientation ?? 0

  return ((angle % FULL_ROTATION_DEGREES) + FULL_ROTATION_DEGREES) % FULL_ROTATION_DEGREES
}

export class ParallaxController {
  readonly #host: HTMLElement
  readonly #motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
  readonly #renderOffset: RenderOffset
  readonly #onInputModeChange: MotionInputChange
  readonly #onMotionPreferenceChange: MotionPreferenceChange
  readonly #handleDeviceOrientation = (event: DeviceOrientationEvent) => {
    if (this.#inputMode !== 'gyroscope' || this.#motionPreference.matches || document.hidden) {
      return
    }

    const axes = getOrientationAxes(event.beta, event.gamma, getScreenAngle())

    if (axes === null) {
      return
    }

    if (this.#orientationBaseline === null) {
      this.#clearSensorFallback()
      this.#stopDragInput()
      this.#orientationBaseline = axes
      this.#reset()
      return
    }

    const offset = getOrientationOffset(axes, this.#orientationBaseline)
    this.#cancelDragReturn()
    this.#isReturning = false
    this.#targetX = offset.x
    this.#targetY = offset.y
    this.#requestFrame()
  }
  readonly #handleDragEnd = (event: PointerEvent) => {
    if (event.pointerId !== this.#activePointerId) {
      return
    }

    this.#releasePointer(event.pointerId)
    this.#activePointerId = null
    this.#scheduleDragReturn()
  }
  readonly #handleDragMove = (event: PointerEvent) => {
    if (
      event.pointerId !== this.#activePointerId ||
      this.#inputMode !== 'drag' ||
      this.#motionPreference.matches
    ) {
      return
    }

    const bounds = this.#host.getBoundingClientRect()

    if (bounds.width === 0 || bounds.height === 0) {
      return
    }

    const horizontalDistance = (event.clientX - this.#dragStartX) / bounds.width
    const verticalDistance = (event.clientY - this.#dragStartY) / bounds.height
    this.#targetX = clamp(this.#dragStartOffsetX - horizontalDistance / DRAG_RANGE_RATIO)
    this.#targetY = clamp(this.#dragStartOffsetY - verticalDistance / DRAG_RANGE_RATIO)
    this.#requestFrame()
    event.preventDefault()
  }
  readonly #handleDragStart = (event: PointerEvent) => {
    if (event.button !== 0 || this.#inputMode !== 'drag' || this.#motionPreference.matches) {
      return
    }

    this.#activePointerId = event.pointerId
    this.#dragStartX = event.clientX
    this.#dragStartY = event.clientY
    this.#dragStartOffsetX = this.#currentX
    this.#dragStartOffsetY = this.#currentY
    this.#targetX = this.#currentX
    this.#targetY = this.#currentY
    this.#cancelDragReturn()
    this.#isReturning = false
    this.#host.setPointerCapture?.(event.pointerId)
    event.preventDefault()
  }
  readonly #handleMotionPreference = () => {
    this.#orientationBaseline = null
    this.#reset(true)
    this.#onMotionPreferenceChange(this.#motionPreference.matches)
  }
  readonly #handleOrientationChange = () => {
    this.#orientationBaseline = null
    this.#reset()
  }
  readonly #handleSensorActivation = () => {
    this.#stopSensorActivation()
    this.#requestDeviceOrientation().catch(() => this.#activateDragFallback())
  }
  readonly #handleVisibilityChange = () => {
    if (document.hidden) {
      this.#handleWindowBlur()
    }
  }
  readonly #handleWindowBlur = () => {
    if (this.#activePointerId !== null) {
      this.#releasePointer(this.#activePointerId)
      this.#activePointerId = null
    }

    this.#orientationBaseline = null
    this.#reset()
  }
  #activePointerId: number | null = null
  #currentX = 0
  #currentY = 0
  #destroyed = false
  #deviceOrientationListening = false
  #dragListening = false
  #dragReturnTimer: number | null = null
  #dragStartOffsetX = 0
  #dragStartOffsetY = 0
  #dragStartX = 0
  #dragStartY = 0
  #frame: number | null = null
  #inputMode: PSceneMotionInput
  #isReturning = false
  #lastFrameTime: number | null = null
  #orientationBaseline: OrientationAxes | null = null
  #sensorActivationListening = false
  #sensorFallbackTimer: number | null = null
  #started = false
  #targetX = 0
  #targetY = 0

  constructor(
    host: HTMLElement,
    renderOffset: RenderOffset,
    options: ParallaxControllerOptions = {},
  ) {
    this.#host = host
    this.#renderOffset = renderOffset
    this.#inputMode = options.inputMode ?? 'drag'
    this.#onInputModeChange = options.onInputModeChange ?? (() => undefined)
    this.#onMotionPreferenceChange = options.onMotionPreferenceChange ?? (() => undefined)
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
    this.#startInput()
  }

  setInputMode(inputMode: PSceneMotionInput) {
    if (inputMode === this.#inputMode) {
      return
    }

    this.#inputMode = inputMode
    this.#orientationBaseline = null
    this.#stopSensorActivation()
    this.#stopDeviceOrientation()
    this.#stopDragInput()
    this.#clearSensorFallback()
    this.#reset()

    if (this.#started) {
      this.#startInput()
    }
  }

  destroy() {
    if (this.#destroyed) {
      return
    }

    this.#destroyed = true
    window.removeEventListener('blur', this.#handleWindowBlur)
    document.removeEventListener('visibilitychange', this.#handleVisibilityChange)
    this.#motionPreference.removeEventListener('change', this.#handleMotionPreference)
    this.#stopSensorActivation()
    this.#stopDeviceOrientation()
    this.#stopDragInput()
    this.#clearSensorFallback()
    this.#cancelDragReturn()

    if (this.#frame !== null) {
      window.cancelAnimationFrame(this.#frame)
      this.#frame = null
    }

    this.#lastFrameTime = null
  }

  #startInput() {
    if (this.#inputMode === 'drag') {
      this.#startDragInput()
      return
    }

    this.#startGyroscopeInput()
  }

  #startDragInput() {
    if (this.#dragListening || this.#destroyed) {
      return
    }

    this.#dragListening = true
    this.#host.addEventListener('pointerdown', this.#handleDragStart)
    this.#host.addEventListener('pointermove', this.#handleDragMove)
    this.#host.addEventListener('pointerup', this.#handleDragEnd)
    this.#host.addEventListener('pointercancel', this.#handleDragEnd)
  }

  #stopDragInput() {
    if (!this.#dragListening) {
      return
    }

    this.#dragListening = false
    this.#host.removeEventListener('pointerdown', this.#handleDragStart)
    this.#host.removeEventListener('pointermove', this.#handleDragMove)
    this.#host.removeEventListener('pointerup', this.#handleDragEnd)
    this.#host.removeEventListener('pointercancel', this.#handleDragEnd)

    if (this.#activePointerId !== null) {
      this.#releasePointer(this.#activePointerId)
      this.#activePointerId = null
    }

    this.#cancelDragReturn()
  }

  #releasePointer(pointerId: number) {
    if (this.#host.hasPointerCapture?.(pointerId)) {
      this.#host.releasePointerCapture(pointerId)
    }
  }

  #startGyroscopeInput() {
    if (!('DeviceOrientationEvent' in window)) {
      this.#activateDragFallback()
      return
    }

    const orientationEvent = DeviceOrientationEvent as typeof DeviceOrientationEvent &
      DeviceOrientationPermissionApi

    if (orientationEvent.requestPermission === undefined) {
      this.#startDeviceOrientation()
      return
    }

    this.#startSensorActivation()
  }

  #startSensorActivation() {
    if (this.#sensorActivationListening || this.#destroyed) {
      return
    }

    this.#sensorActivationListening = true
    window.addEventListener('pointerdown', this.#handleSensorActivation, {passive: true})
    window.addEventListener('pointerup', this.#handleSensorActivation, {passive: true})
  }

  #stopSensorActivation() {
    if (!this.#sensorActivationListening) {
      return
    }

    this.#sensorActivationListening = false
    window.removeEventListener('pointerdown', this.#handleSensorActivation)
    window.removeEventListener('pointerup', this.#handleSensorActivation)
  }

  async #requestDeviceOrientation() {
    const orientationEvent = DeviceOrientationEvent as typeof DeviceOrientationEvent &
      DeviceOrientationPermissionApi
    const permission = await orientationEvent.requestPermission?.()

    if (this.#destroyed || this.#inputMode !== 'gyroscope') {
      return
    }

    if (permission === undefined || permission === 'granted') {
      this.#startDeviceOrientation()
      return
    }

    this.#activateDragFallback()
  }

  #startDeviceOrientation() {
    this.#stopSensorActivation()
    this.#deviceOrientationListening = true
    window.addEventListener('deviceorientation', this.#handleDeviceOrientation, {passive: true})
    window.addEventListener('orientationchange', this.#handleOrientationChange, {passive: true})
    globalThis.screen.orientation?.addEventListener('change', this.#handleOrientationChange)
    this.#sensorFallbackTimer = window.setTimeout(
      () => this.#activateDragFallback(),
      SENSOR_FALLBACK_DELAY,
    )
  }

  #stopDeviceOrientation() {
    if (!this.#deviceOrientationListening) {
      return
    }

    this.#deviceOrientationListening = false
    window.removeEventListener('deviceorientation', this.#handleDeviceOrientation)
    window.removeEventListener('orientationchange', this.#handleOrientationChange)
    globalThis.screen.orientation?.removeEventListener('change', this.#handleOrientationChange)
    this.#orientationBaseline = null
  }

  #activateDragFallback() {
    if (this.#destroyed) {
      return
    }

    this.#inputMode = 'drag'
    this.#stopSensorActivation()
    this.#stopDeviceOrientation()
    this.#clearSensorFallback()
    this.#reset()
    this.#startDragInput()
    this.#onInputModeChange('drag')
  }

  #clearSensorFallback() {
    if (this.#sensorFallbackTimer === null) {
      return
    }

    window.clearTimeout(this.#sensorFallbackTimer)
    this.#sensorFallbackTimer = null
  }

  #cancelDragReturn() {
    if (this.#dragReturnTimer === null) {
      return
    }

    window.clearTimeout(this.#dragReturnTimer)
    this.#dragReturnTimer = null
  }

  #scheduleDragReturn() {
    if (this.#dragReturnTimer !== null) {
      return
    }

    this.#dragReturnTimer = window.setTimeout(() => {
      this.#dragReturnTimer = null
      this.#reset()
    }, DRAG_RETURN_DELAY)
  }

  #reset(immediate = false) {
    this.#cancelDragReturn()
    this.#isReturning = true
    this.#targetX = 0
    this.#targetY = 0

    if (immediate) {
      if (this.#frame !== null) {
        window.cancelAnimationFrame(this.#frame)
        this.#frame = null
      }

      this.#currentX = 0
      this.#currentY = 0
      this.#isReturning = false
      this.#lastFrameTime = null
      this.#renderOffset(0, 0)
      return
    }

    this.#requestFrame()
  }

  #requestFrame() {
    if (this.#frame !== null || this.#destroyed) {
      return
    }

    this.#lastFrameTime ??= performance.now()
    this.#frame = window.requestAnimationFrame((time) => this.#renderFrame(time))
  }

  #renderFrame(time: number) {
    this.#frame = null
    const frameDuration = Math.min(
      MAXIMUM_FRAME_DURATION,
      Math.max(0, time - (this.#lastFrameTime ?? time)),
    )
    this.#lastFrameTime = time
    const easing = getFrameEasing(
      frameDuration,
      this.#isReturning ? RETURN_TIME_CONSTANT : FOLLOW_TIME_CONSTANT,
    )
    const horizontalDistance = this.#targetX - this.#currentX
    const verticalDistance = this.#targetY - this.#currentY
    this.#currentX += horizontalDistance * easing
    this.#currentY += verticalDistance * easing

    const shouldContinue =
      Math.abs(this.#targetX - this.#currentX) > PARALLAX_SETTLE_DISTANCE ||
      Math.abs(this.#targetY - this.#currentY) > PARALLAX_SETTLE_DISTANCE

    if (!shouldContinue) {
      this.#currentX = this.#targetX
      this.#currentY = this.#targetY
      this.#isReturning = false
      this.#lastFrameTime = null
    }

    this.#renderOffset(this.#currentX, this.#currentY)

    if (shouldContinue) {
      this.#requestFrame()
    }
  }
}
