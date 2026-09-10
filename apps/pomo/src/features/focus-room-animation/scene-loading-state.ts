const ignoreLoadingChange = () => undefined

/** Delays the settled state until the newly rendered scene has reached the screen. */
export class SceneLoadingState {
  readonly #onChange: (isLoading: boolean) => void
  #settledFrame: number | null = null

  constructor(onChange: ((isLoading: boolean) => void) | undefined) {
    this.#onChange = onChange ?? ignoreLoadingChange
  }

  start() {
    this.#cancelSettledFrame()
    this.#onChange(true)
  }

  finish() {
    this.#cancelSettledFrame()
    this.#onChange(false)
  }

  finishAfterPaint() {
    this.#cancelSettledFrame()
    this.#settledFrame = globalThis.requestAnimationFrame(() => {
      this.#settledFrame = globalThis.requestAnimationFrame(() => {
        this.#settledFrame = null
        this.#onChange(false)
      })
    })
  }

  destroy() {
    this.#cancelSettledFrame()
  }

  #cancelSettledFrame() {
    if (this.#settledFrame !== null) {
      globalThis.cancelAnimationFrame(this.#settledFrame)
      this.#settledFrame = null
    }
  }
}
