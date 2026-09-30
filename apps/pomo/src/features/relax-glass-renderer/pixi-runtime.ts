import {Application, Texture, type WebGLRenderer} from 'pixi.js'

const MAX_RENDER_RESOLUTION = 1.5

/** Owns the Pixi application and browser subscriptions for one glass canvas. */
export class GlassPixiRuntime {
  readonly application = new Application()
  #initialized = false
  #disposed = false
  #observer: ResizeObserver | null = null
  #motionPreference: MediaQueryList | null = null
  #motionChange: (() => void) | null = null

  get initialized() {
    return this.#initialized
  }

  async initialize(canvas: HTMLCanvasElement): Promise<boolean> {
    try {
      await this.application.init({
        autoDensity: false,
        autoStart: false,
        backgroundAlpha: 1,
        canvas,
        height: 1,
        preference: 'webgl',
        resolution: Math.min(globalThis.devicePixelRatio, MAX_RENDER_RESOLUTION),
        width: 1,
      })
    } catch (error: unknown) {
      if (this.application.renderer !== undefined) {
        this.application.destroy(false, {children: true})
      }
      this.#disposed = true
      throw error
    }
    this.#initialized = true
    if (this.#disposed) {
      this.application.destroy(false, {children: true})
      return false
    }
    try {
      this.#installRainBlendMode(this.application.renderer as WebGLRenderer)
    } catch (error: unknown) {
      this.destroy()
      throw error
    }
    return true
  }

  attachEnvironment(canvas: HTMLCanvasElement, onResize: () => void, onMotion: () => void) {
    this.#observer = new ResizeObserver(onResize)
    this.#observer.observe(canvas)
    this.#motionPreference = globalThis.matchMedia('(prefers-reduced-motion: reduce)')
    this.#motionChange = onMotion
    this.#motionPreference.addEventListener('change', onMotion)
    globalThis.document.addEventListener('visibilitychange', onMotion)
  }

  isMotionPaused() {
    return globalThis.document.hidden || this.#motionPreference?.matches === true
  }

  async loadTexture(source: string): Promise<Texture> {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.src = source
    await image.decode()
    return Texture.from(image)
  }

  destroy() {
    if (this.#disposed) {
      return
    }
    this.#disposed = true
    this.#observer?.disconnect()
    if (this.#motionChange !== null) {
      this.#motionPreference?.removeEventListener('change', this.#motionChange)
      globalThis.document.removeEventListener('visibilitychange', this.#motionChange)
    }
    if (this.#initialized) {
      this.application.destroy(false, {children: true})
    }
  }

  #installRainBlendMode(renderer: WebGLRenderer) {
    const {gl} = renderer
    const state = renderer.state as unknown as {blendModesMap?: Record<string, number[]>}
    if (state.blendModesMap === undefined) {
      throw new Error('PixiJS WebGL blend-mode map is unavailable')
    }
    // The rain normal stamps need the reference effect's fixed-function exclusion factors.
    state.blendModesMap.exclusion = [
      gl.ONE_MINUS_DST_COLOR,
      gl.ONE_MINUS_SRC_COLOR,
      gl.ONE,
      gl.ONE_MINUS_SRC_ALPHA,
    ]
  }
}
