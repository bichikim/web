/* eslint-disable no-magic-numbers -- AI_NOTE - Particle timing and placement are visually tuned against the fixed 1672x941 focus-room masters. */
import {Container, Sprite, type Texture} from 'pixi.js'

interface SteamParticle {
  readonly horizontalDrift: number
  readonly lifetime: number
  readonly phase: number
  readonly rotation: number
  readonly sprite: Sprite
}

export interface SteamParticleSystemOptions {
  readonly onRender: () => void
  readonly prefersReducedMotion: boolean
  readonly textures: readonly Texture[]
}

const SOURCE_X = 1_280
const SOURCE_Y = 686
const RISE_DISTANCE = 12
const PARTICLE_COUNT = 4
const MINIMUM_LIFETIME = 6_000
const LIFETIME_VARIANCE = 2_000
const MAXIMUM_ALPHA = 0.24
const INITIAL_SCALE = 0.36
const SCALE_GROWTH = 0.04

const smoothStep = (value: number) => value * value * (3 - 2 * value)

const getOpacity = (progress: number) => {
  const fadeIn = smoothStep(Math.min(1, progress / 0.2))
  const fadeOut = 1 - smoothStep(Math.max(0, (progress - 0.48) / 0.52))

  return fadeIn * fadeOut * MAXIMUM_ALPHA
}

export class SteamParticleSystem {
  readonly container = new Container()
  readonly #onRender: () => void
  readonly #particles: readonly SteamParticle[]
  readonly #prefersReducedMotion: boolean
  #destroyed = false
  #frame: number | null = null
  #startedAt = 0

  constructor(options: SteamParticleSystemOptions) {
    this.#onRender = options.onRender
    this.#prefersReducedMotion = options.prefersReducedMotion
    this.container.zIndex = 3
    this.#particles = Array.from({length: PARTICLE_COUNT}, (_, index) => {
      const sprite = new Sprite(options.textures[index % options.textures.length])
      const phase = index / PARTICLE_COUNT

      sprite.anchor.set(0.5)
      sprite.alpha = 0
      sprite.rotation = ((index % 3) - 1) * 0.12
      this.container.addChild(sprite)

      return {
        horizontalDrift: 3 + (index % 4),
        lifetime: MINIMUM_LIFETIME + (index % 5) * (LIFETIME_VARIANCE / 4),
        phase,
        rotation: (index % 2 === 0 ? 1 : -1) * 0.012,
        sprite,
      }
    })
  }

  start() {
    if (this.#destroyed) {
      return
    }

    this.#startedAt = window.performance.now()

    if (this.#prefersReducedMotion) {
      this.#renderParticles(MINIMUM_LIFETIME * 0.42)
      this.#onRender()
      return
    }

    this.#requestFrame()
  }

  setParallaxOffset(x: number, y: number) {
    this.container.position.set(x, y)
  }

  destroy() {
    if (this.#destroyed) {
      return
    }

    this.#destroyed = true

    if (this.#frame !== null) {
      window.cancelAnimationFrame(this.#frame)
      this.#frame = null
    }

    this.container.removeFromParent()
    this.container.destroy({children: true})
  }

  #requestFrame() {
    if (this.#frame !== null || this.#destroyed) {
      return
    }

    this.#frame = window.requestAnimationFrame((timestamp) => {
      this.#frame = null
      this.#renderParticles(timestamp - this.#startedAt)
      this.#onRender()
      this.#requestFrame()
    })
  }

  #renderParticles(elapsed: number) {
    for (const particle of this.#particles) {
      const progress = (elapsed / particle.lifetime + particle.phase) % 1
      const rise = smoothStep(progress)
      const horizontalWave = Math.sin(progress * Math.PI * 2 + particle.phase * Math.PI)
      const scale = INITIAL_SCALE + rise * SCALE_GROWTH

      particle.sprite.position.set(
        SOURCE_X + horizontalWave * particle.horizontalDrift,
        SOURCE_Y - rise * RISE_DISTANCE,
      )
      particle.sprite.scale.set(scale, scale)
      particle.sprite.rotation = particle.rotation * horizontalWave
      particle.sprite.alpha = getOpacity(progress)
    }
  }
}
