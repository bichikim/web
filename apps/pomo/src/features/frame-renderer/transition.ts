import {type Application, Rectangle, Sprite, type Texture, type Ticker} from 'pixi.js'
import {ScreenEffect} from './effect'
import type {TransitionEffect} from '../background'

const FADE_DURATION = 500

/** Owns an outgoing screen snapshot and its temporary animation callback. */
export class PhotoTransition {
  readonly #application: Application
  #overlay: Sprite | null = null
  #effect: ScreenEffect | null = null
  #target: Texture | null = null
  #cancel: (() => void) | null = null

  constructor(application: Application) {
    this.#application = application
  }

  capture() {
    this.cancel()
    const {renderer, stage} = this.#application
    const {width, height} = renderer.screen
    const texture = renderer.generateTexture({
      frame: new Rectangle(0, 0, width, height),
      resolution: renderer.resolution,
      target: stage,
    })
    this.clear()
    this.#overlay = new Sprite(texture)
    stage.addChild(this.#overlay)
  }

  resize(width: number, height: number) {
    const overlay = this.#overlay
    if (overlay !== null) {
      overlay.width = width
      overlay.height = height
      this.#application.stage.addChild(overlay)
    }
  }

  play(effect: TransitionEffect): Promise<boolean> {
    this.cancel()
    const overlay = this.#overlay
    if (overlay === null || effect === 'none') {
      this.clear()
      this.#application.render()
      return Promise.resolve(true)
    }
    if (effect !== 'fade') {
      const {renderer, stage} = this.#application
      overlay.visible = false
      try {
        this.#target = renderer.generateTexture({
          frame: new Rectangle(0, 0, renderer.screen.width, renderer.screen.height),
          resolution: renderer.resolution,
          target: stage,
        })
        this.#effect = new ScreenEffect({effect, from: overlay.texture, to: this.#target})
        overlay.filters = [this.#effect]
      } finally {
        overlay.visible = true
      }
    }
    return new Promise((resolve) => {
      let elapsed = 0
      const update = (ticker: Ticker) => {
        elapsed += ticker.elapsedMS
        const progress = Math.min(1, elapsed / FADE_DURATION)
        if (this.#effect === null) {
          overlay.alpha = 1 - progress
        } else {
          this.#effect.setProgress(progress)
        }
        if (progress === 1) {
          this.#cancel = null
          this.#application.ticker.remove(update)
          this.#application.stop()
          this.clear()
          this.#application.render()
          resolve(true)
        }
      }
      this.#cancel = () => {
        this.#application.ticker.remove(update)
        this.#application.stop()
        resolve(false)
      }
      this.#application.ticker.add(update)
      this.#application.start()
    })
  }

  cancel() {
    this.#cancel?.()
    this.#cancel = null
  }

  clear() {
    this.cancel()
    this.#overlay?.destroy({texture: true, textureSource: true})
    this.#overlay = null
    this.#effect?.destroy()
    this.#effect = null
    this.#target?.destroy(true)
    this.#target = null
  }
}
