import {getOrientationAxes, getOrientationOffset, type OrientationAxes} from './device-orientation'
import {createMotionEnvironment, type MotionEnvironment} from './motion-environment'
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

export interface ParallaxControllerOptions {
  readonly environment?: MotionEnvironment
  readonly inputMode?: PSceneMotionInput
  readonly onInputModeChange?: MotionInputChange
  readonly onMotionPreferenceChange?: MotionPreferenceChange
}

const clamp = (value: number) => Math.max(-1, Math.min(1, value))
const getFrameEasing = (duration: number, timeConstant: number) =>
  1 - Math.exp(-duration / timeConstant)

const getScreenAngle = (angle: number) => {
  return ((angle % FULL_ROTATION_DEGREES) + FULL_ROTATION_DEGREES) % FULL_ROTATION_DEGREES
}

export class ParallaxController {
  readonly #host: HTMLElement
  readonly #environment: MotionEnvironment
  readonly #motionPreference: MediaQueryList
  readonly #renderOffset: RenderOffset
  readonly #onInputModeChange: MotionInputChange
  readonly #onMotionPreferenceChange: MotionPreferenceChange
  readonly #handleDeviceOrientation = (event: DeviceOrientationEvent) => {
    if (
      this.#inputMode !== 'gyroscope' ||
      this.#motionPreference.matches ||
      this.#environment.document.hidden
    ) {
      return
    }

    const axes = getOrientationAxes(
      event.beta,
      event.gamma,
      getScreenAngle(this.#environment.getAngle()),
    )

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
    if (this.#environment.document.hidden) {
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
  #dragReturnTimer: ReturnType<typeof globalThis.setTimeout> | null = null
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
  #sensorFallbackTimer: ReturnType<typeof globalThis.setTimeout> | null = null
  #started = false
  #targetX = 0
  #targetY = 0

  constructor(
    host: HTMLElement,
    renderOffset: RenderOffset,
    options: ParallaxControllerOptions = {},
  ) {
    this.#environment = options.environment ?? createMotionEnvironment()
    this.#motionPreference = this.#environment.window.matchMedia('(prefers-reduced-motion: reduce)')
    this.#host = host
    this.#renderOffset = renderOffset
    this.#inputMode = options.inputMode ?? 'drag'
    this.#onInputModeChange = options.onInputModeChange ?? (() => undefined)
    this.#onMotionPreferenceChange = options.onMotionPreferenceChange ?? (() => undefined)
  }

  readonly onPointerDown = (event: PointerEvent) => {
    if (this.#dragListening && !this.#destroyed) {
      this.#handleDragStart(event)
    }
  }

  readonly onPointerMove = (event: PointerEvent) => {
    if (this.#dragListening && !this.#destroyed) {
      this.#handleDragMove(event)
    }
  }

  readonly onPointerUp = (event: PointerEvent) => {
    if (this.#dragListening && !this.#destroyed) {
      this.#handleDragEnd(event)
    }
  }

  readonly onPointerCancel = (event: PointerEvent) => {
    if (this.#dragListening && !this.#destroyed) {
      this.#handleDragEnd(event)
    }
  }

  get prefersReducedMotion() {
    return this.#motionPreference.matches
  }

  start() {
    if (this.#destroyed || this.#started) {
      return
    }

    this.#started = true
    this.#environment.window.addEventListener('blur', this.#handleWindowBlur)
    this.#environment.document.addEventListener('visibilitychange', this.#handleVisibilityChange)
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
    this.#environment.window.removeEventListener('blur', this.#handleWindowBlur)
    this.#environment.document.removeEventListener('visibilitychange', this.#handleVisibilityChange)
    this.#motionPreference.removeEventListener('change', this.#handleMotionPreference)
    this.#stopSensorActivation()
    this.#stopDeviceOrientation()
    this.#stopDragInput()
    this.#clearSensorFallback()
    this.#cancelDragReturn()

    if (this.#frame !== null) {
      this.#environment.cancelFrame(this.#frame)
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
  }

  #stopDragInput() {
    if (!this.#dragListening) {
      return
    }

    this.#dragListening = false

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
    const orientationEvent = this.#environment.getSensor()
    if (orientationEvent === null) {
      this.#activateDragFallback()
      return
    }

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
    this.#environment.window.addEventListener('pointerdown', this.#handleSensorActivation, {
      passive: true,
    })
    this.#environment.window.addEventListener('pointerup', this.#handleSensorActivation, {
      passive: true,
    })
  }

  #stopSensorActivation() {
    if (!this.#sensorActivationListening) {
      return
    }

    this.#sensorActivationListening = false
    this.#environment.window.removeEventListener('pointerdown', this.#handleSensorActivation)
    this.#environment.window.removeEventListener('pointerup', this.#handleSensorActivation)
  }

  async #requestDeviceOrientation() {
    const orientationEvent = this.#environment.getSensor()
    if (orientationEvent === null) {
      this.#activateDragFallback()
      return
    }
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
    this.#environment.window.addEventListener('deviceorientation', this.#handleDeviceOrientation, {
      passive: true,
    })
    this.#environment.window.addEventListener('orientationchange', this.#handleOrientationChange, {
      passive: true,
    })
    this.#environment.orientation?.addEventListener('change', this.#handleOrientationChange)
    this.#sensorFallbackTimer = this.#environment.setTimer(
      () => this.#activateDragFallback(),
      SENSOR_FALLBACK_DELAY,
    )
  }

  #stopDeviceOrientation() {
    if (!this.#deviceOrientationListening) {
      return
    }

    this.#deviceOrientationListening = false
    this.#environment.window.removeEventListener('deviceorientation', this.#handleDeviceOrientation)
    this.#environment.window.removeEventListener('orientationchange', this.#handleOrientationChange)
    this.#environment.orientation?.removeEventListener('change', this.#handleOrientationChange)
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

    this.#environment.clearTimer(this.#sensorFallbackTimer)
    this.#sensorFallbackTimer = null
  }

  #cancelDragReturn() {
    if (this.#dragReturnTimer === null) {
      return
    }

    this.#environment.clearTimer(this.#dragReturnTimer)
    this.#dragReturnTimer = null
  }

  #scheduleDragReturn() {
    if (this.#dragReturnTimer !== null) {
      return
    }

    this.#dragReturnTimer = this.#environment.setTimer(() => {
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
        this.#environment.cancelFrame(this.#frame)
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

    this.#lastFrameTime ??= this.#environment.now()
    this.#frame = this.#environment.requestFrame((time) => this.#renderFrame(time))
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
