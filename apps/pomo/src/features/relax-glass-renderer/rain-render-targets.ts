import {RenderTexture} from 'pixi.js'

interface RainTextures {
  readonly rain: RenderTexture
  readonly droplet: RenderTexture
  readonly dropletHistory: RenderTexture
  readonly mist: RenderTexture
  readonly mistHistory: RenderTexture
}

/** Owns the five render textures used by the rain, droplet, and mist passes. */
export class RainRenderTargets {
  readonly rain: RenderTexture
  readonly droplet: RenderTexture
  readonly dropletHistory: RenderTexture
  readonly mist: RenderTexture
  readonly mistHistory: RenderTexture
  readonly #textures: readonly RenderTexture[]
  #destroyed = false

  private constructor(textures: RainTextures) {
    this.rain = textures.rain
    this.droplet = textures.droplet
    this.dropletHistory = textures.dropletHistory
    this.mist = textures.mist
    this.mistHistory = textures.mistHistory
    this.#textures = [this.rain, this.droplet, this.dropletHistory, this.mist, this.mistHistory]
  }

  static create(): RainRenderTargets {
    const textures: RenderTexture[] = []
    const allocate = () => {
      const texture = RenderTexture.create({dynamic: true, height: 1, width: 1})
      textures.push(texture)
      return texture
    }

    try {
      const rain = allocate()
      const droplet = allocate()
      const dropletHistory = allocate()
      const mist = allocate()
      const mistHistory = allocate()
      return new RainRenderTargets({droplet, dropletHistory, mist, mistHistory, rain})
    } catch (error: unknown) {
      for (const texture of textures) {
        texture.destroy(true)
      }
      throw error
    }
  }

  resize(width: number, height: number) {
    for (const texture of this.#textures) {
      texture.resize(width, height)
    }
  }

  destroy() {
    if (this.#destroyed) {
      return
    }
    this.#destroyed = true
    for (const texture of this.#textures) {
      texture.destroy(true)
    }
  }
}
