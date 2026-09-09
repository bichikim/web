import {type Application, Sprite, Texture, type Ticker} from 'pixi.js'

const CENTER_ANCHOR = 0.5
const FADE_DURATION = 700
const SNAPSHOT_LENGTH = 1024

/** Holds the final video frame over the restarted video until its fade completes. */
export class VideoLoop {
  readonly #application: Application
  readonly #video: HTMLVideoElement
  readonly #sprite: Sprite
  #overlay: Sprite | null = null
  #elapsed = 0

  constructor(application: Application, video: HTMLVideoElement, sprite: Sprite) {
    this.#application = application
    this.#video = video
    this.#sprite = sprite
  }

  async repeat(): Promise<void> {
    this.destroy()
    const canvas = document.createElement('canvas')
    const scale = Math.min(
      1,
      SNAPSHOT_LENGTH / Math.max(this.#video.videoWidth, this.#video.videoHeight),
    )
    canvas.width = Math.max(1, Math.round(this.#video.videoWidth * scale))
    canvas.height = Math.max(1, Math.round(this.#video.videoHeight * scale))
    const context = canvas.getContext('2d')
    if (context === null) {
      throw new Error('Video loop snapshot is unavailable.')
    }
    context.drawImage(this.#video, 0, 0, canvas.width, canvas.height)
    const overlay = new Sprite(Texture.from(canvas))
    overlay.anchor.set(CENTER_ANCHOR)
    this.#overlay = overlay
    this.resize()
    const {stage} = this.#application
    stage.addChildAt(overlay, stage.getChildIndex(this.#sprite) + 1)
    this.#video.currentTime = 0
    await this.#video.play()
    if (this.#overlay !== overlay) {
      return
    }
    this.#elapsed = 0
    this.#application.ticker.add(this.#update)
    this.#application.start()
  }

  resize() {
    const overlay = this.#overlay
    if (overlay === null) {
      return
    }
    overlay.position.copyFrom(this.#sprite.position)
    overlay.width = this.#sprite.width
    overlay.height = this.#sprite.height
  }

  readonly #update = (ticker: Ticker) => {
    this.#elapsed += ticker.elapsedMS
    const progress = Math.min(1, this.#elapsed / FADE_DURATION)
    if (this.#overlay !== null) {
      this.#overlay.alpha = (1 + Math.cos(Math.PI * progress)) / 2
    }
    if (progress >= 1) {
      this.destroy()
    }
  }

  destroy() {
    this.#application.ticker.remove(this.#update)
    this.#overlay?.destroy({texture: true, textureSource: true})
    this.#overlay = null
  }
}
