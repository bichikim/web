/* eslint-disable no-magic-numbers -- Rain depth, density, and movement are visually tuned against the fixed focus-room master. */
import {Container, Particle, ParticleContainer, Rectangle, Sprite, Texture} from 'pixi.js'

interface FallingStreak {
  readonly drift: number
  readonly particle: Particle
  readonly speed: number
}

export interface FallingStreaksEffectOptions {
  readonly height: number
  readonly maskTexture: Texture
  readonly random: () => number
  readonly width: number
}

const PARTICLE_COUNT = 72
const ANGLE_RADIANS = -0.16
const DEPTH_SPEEDS = [460, 690, 940] as const
const DEPTH_LENGTHS = [16, 25, 38] as const
const DEPTH_WIDTHS = [0.8, 1.1, 1.5] as const
const DEPTH_ALPHAS = [0.14, 0.21, 0.3] as const
const DEPTH_TINTS = [0xbfd3dc, 0xd4e1e7, 0xeaf2f5] as const
const RESET_MARGIN = 48

/** Renders deterministic, depth-layered falling streaks through a fixed scene mask. */
export class FallingStreaksEffect {
  readonly container = new Container()
  readonly #height: number
  readonly #particleContainer: ParticleContainer<Particle>
  readonly #random: () => number
  readonly #streaks: readonly FallingStreak[]
  readonly #width: number
  #destroyed = false

  constructor(options: FallingStreaksEffectOptions) {
    this.#height = options.height
    this.#random = options.random
    this.#width = options.width
    this.#particleContainer = new ParticleContainer<Particle>({
      boundsArea: new Rectangle(0, 0, options.width, options.height),
      dynamicProperties: {
        color: false,
        position: true,
        rotation: false,
        uvs: false,
        vertex: false,
      },
      texture: Texture.WHITE,
    })

    const maskedContent = new Container()
    const maskSprite = new Sprite(options.maskTexture)
    maskedContent.addChild(this.#particleContainer)
    this.container.addChild(maskSprite, maskedContent)
    maskedContent.setMask({channel: 'red', mask: maskSprite})

    const textureWidth = Texture.WHITE.width
    const textureHeight = Texture.WHITE.height
    this.#streaks = Array.from({length: PARTICLE_COUNT}, (_, index) => {
      const depth = index % DEPTH_SPEEDS.length
      const speed = DEPTH_SPEEDS[depth] * (0.88 + this.#random() * 0.24)
      const particle = new Particle({
        alpha: DEPTH_ALPHAS[depth] * (0.82 + this.#random() * 0.18),
        anchorX: 0.5,
        anchorY: 0.5,
        rotation: ANGLE_RADIANS,
        scaleX: DEPTH_WIDTHS[depth] / textureWidth,
        scaleY: DEPTH_LENGTHS[depth] / textureHeight,
        texture: Texture.WHITE,
        tint: DEPTH_TINTS[depth],
        x: this.#random() * options.width,
        y: this.#random() * options.height,
      })
      this.#particleContainer.addParticle(particle)

      return {
        drift: speed * -Math.sin(ANGLE_RADIANS),
        particle,
        speed: speed * Math.cos(ANGLE_RADIANS),
      }
    })
  }

  advance(deltaSeconds: number) {
    if (this.#destroyed) {
      return
    }

    for (const streak of this.#streaks) {
      streak.particle.x += streak.drift * deltaSeconds
      streak.particle.y += streak.speed * deltaSeconds

      if (
        streak.particle.y > this.#height + RESET_MARGIN ||
        streak.particle.x > this.#width + RESET_MARGIN
      ) {
        streak.particle.x = this.#random() * this.#width - RESET_MARGIN
        streak.particle.y = -this.#random() * RESET_MARGIN
      }
    }
  }

  setAnimationEnabled(animationEnabled: boolean) {
    this.container.visible = animationEnabled
  }

  destroy() {
    if (this.#destroyed) {
      return
    }

    this.#destroyed = true
    this.container.removeFromParent()
    this.container.destroy({children: true})
  }
}
