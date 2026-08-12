const PARALLAX_EASING = 0.12
const PARALLAX_MAXIMUM_X = 9
const PARALLAX_MAXIMUM_Y = 6
const PARALLAX_SETTLE_DISTANCE = 0.01

type RenderOffset = (x: number, y: number) => void

const clamp = (value: number) => Math.max(-1, Math.min(1, value))

export class ParallaxController {
  readonly #host: HTMLElement
  readonly #motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
  readonly #renderOffset: RenderOffset
  readonly #handleMotionPreference = () => {
    if (this.#motionPreference.matches) {
      this.#reset(true)
    }
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
  #frame: number | null = null
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
    window.addEventListener('pointermove', this.#handlePointerMove, {passive: true})
    window.addEventListener('blur', this.#handlePointerLeave)
    document.documentElement.addEventListener('pointerleave', this.#handlePointerLeave)
    this.#motionPreference.addEventListener('change', this.#handleMotionPreference)
  }

  destroy() {
    if (this.#destroyed) {
      return
    }

    this.#destroyed = true
    window.removeEventListener('pointermove', this.#handlePointerMove)
    window.removeEventListener('blur', this.#handlePointerLeave)
    document.documentElement.removeEventListener('pointerleave', this.#handlePointerLeave)
    this.#motionPreference.removeEventListener('change', this.#handleMotionPreference)

    if (this.#frame !== null) {
      window.cancelAnimationFrame(this.#frame)
      this.#frame = null
    }
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
