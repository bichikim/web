/* eslint-disable no-magic-numbers -- Snow depth, density, and movement are visually tuned against the fixed focus-room master. */
import {Container, Particle, ParticleContainer, Rectangle, Sprite, Texture} from 'pixi.js'

interface FallingFlake {
  readonly particles: readonly Particle[]
  readonly rotationSpeed: number
  readonly speed: number
  readonly swaySpeed: number
  readonly swayFrequency: number
  phase: number
}

export interface FallingFlakesEffectOptions {
  readonly height: number
  readonly maskTexture: Texture
  readonly random: () => number
  readonly width: number
}

const PARTICLE_COUNT = 240
const DEPTH_SPEEDS = [30, 44, 64, 92] as const
const DEPTH_SIZES = [2, 4, 7, 11] as const
const DEPTH_BRANCH_WIDTHS = [0.45, 0.7, 1, 1.4] as const
const DEPTH_ALPHAS = [0.38, 0.52, 0.7, 0.9] as const
const DEPTH_TINTS = [0xffffff, 0xffffff, 0xffffff, 0xffffff] as const
const DEPTH_SWAY_SPEEDS = [12, 20, 32, 48] as const
const DEPTH_SWAY_FREQUENCIES = [0.9, 1.2, 1.5, 1.9] as const
const DEPTH_PATTERN = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 3] as const
const RESET_MARGIN = 24
const FULL_ROTATION = Math.PI * 2
const BRANCH_ROTATIONS = [0, Math.PI / 3, (Math.PI * 2) / 3] as const

/** Renders softly swaying, depth-layered snowflakes through a fixed scene mask. */
export class FallingFlakesEffect {
  readonly container = new Container()
  readonly #flakes: readonly FallingFlake[]
  readonly #height: number
  readonly #particleContainer: ParticleContainer<Particle>
  readonly #random: () => number
  readonly #width: number
  #destroyed = false

  constructor(options: FallingFlakesEffectOptions) {
    this.#height = options.height
    this.#random = options.random
    this.#width = options.width
    this.#particleContainer = new ParticleContainer<Particle>({
      boundsArea: new Rectangle(0, 0, options.width, options.height),
      dynamicProperties: {
        color: false,
        position: true,
        rotation: true,
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
    this.#flakes = Array.from({length: PARTICLE_COUNT}, (_, index) => {
      const depth = DEPTH_PATTERN[index % DEPTH_PATTERN.length]
      const size = DEPTH_SIZES[depth] * (0.82 + this.#random() * 0.36)
      const alpha = DEPTH_ALPHAS[depth] * (0.82 + this.#random() * 0.18)
      const rotation = this.#random() * FULL_ROTATION
      const x = this.#random() * options.width
      const y = this.#random() * options.height
      const particles = BRANCH_ROTATIONS.map((branchRotation) => {
        const particle = new Particle({
          alpha,
          anchorX: 0.5,
          anchorY: 0.5,
          rotation: rotation + branchRotation,
          scaleX: DEPTH_BRANCH_WIDTHS[depth] / textureWidth,
          scaleY: size / textureHeight,
          texture: Texture.WHITE,
          tint: DEPTH_TINTS[depth],
          x,
          y,
        })
        this.#particleContainer.addParticle(particle)
        return particle
      })

      return {
        particles,
        phase: this.#random() * FULL_ROTATION,
        rotationSpeed: (this.#random() - 0.5) * 1.2,
        speed: DEPTH_SPEEDS[depth] * (0.82 + this.#random() * 0.36),
        swayFrequency: DEPTH_SWAY_FREQUENCIES[depth] * (0.85 + this.#random() * 0.3),
        swaySpeed: DEPTH_SWAY_SPEEDS[depth] * (0.8 + this.#random() * 0.4),
      }
    })
  }

  advance(deltaSeconds: number) {
    if (this.#destroyed) {
      return
    }

    for (const flake of this.#flakes) {
      const [primaryParticle] = flake.particles
      flake.phase += flake.swayFrequency * deltaSeconds
      let x = primaryParticle.x + Math.sin(flake.phase) * flake.swaySpeed * deltaSeconds
      let y = primaryParticle.y + flake.speed * deltaSeconds

      if (y > this.#height + RESET_MARGIN || x < -RESET_MARGIN || x > this.#width + RESET_MARGIN) {
        x = this.#random() * this.#width
        y = -this.#random() * RESET_MARGIN
        flake.phase = this.#random() * FULL_ROTATION
      }

      for (const particle of flake.particles) {
        particle.x = x
        particle.y = y
        particle.rotation += flake.rotationSpeed * deltaSeconds
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
