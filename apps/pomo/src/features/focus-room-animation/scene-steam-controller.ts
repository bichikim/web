import {type Container} from 'pixi.js'

import steamImage1 from './assets/animation/steam/01.webp'
import steamImage2 from './assets/animation/steam/02.webp'
import steamImage3 from './assets/animation/steam/03.webp'
import steamImage4 from './assets/animation/steam/04.webp'
import type {PSceneStyle} from './scene-style'
import {SteamParticleSystem} from './steam-particle-system'
import {acquireTextureGroup, releaseTextureGroup, type TextureLease} from './texture-leases'

interface PSceneSteamControllerOptions {
  readonly getPrefersReducedMotion: () => boolean
  readonly onRender: () => void
  readonly stage: Container
}

const STEAM_SOURCES = [steamImage1, steamImage2, steamImage3, steamImage4] as const

/** Owns lazy loading and the render lifecycle of the original-style steam overlay. */
export class PSceneSteamController {
  readonly #getPrefersReducedMotion: () => boolean
  readonly #onRender: () => void
  readonly #stage: Container
  #destroyed = false
  #leases: readonly TextureLease[] = []
  #loading: Promise<void> | null = null
  #parallaxX = 0
  #parallaxY = 0
  #sceneStyle: PSceneStyle | undefined
  #started = false
  #system: SteamParticleSystem | null = null

  constructor(options: PSceneSteamControllerOptions) {
    this.#getPrefersReducedMotion = options.getPrefersReducedMotion
    this.#onRender = options.onRender
    this.#stage = options.stage
  }

  async ensure(sceneStyle: PSceneStyle | undefined) {
    this.setSceneStyle(sceneStyle)

    if (sceneStyle === 'scribble' || this.#system !== null || this.#destroyed) {
      return
    }

    const currentLoad = this.#loading

    if (currentLoad !== null) {
      await currentLoad
      return
    }

    const nextLoad = this.#load()
    this.#loading = nextLoad

    try {
      await nextLoad
    } finally {
      this.#loading = null
    }
  }

  setParallaxOffset(x: number, y: number) {
    this.#parallaxX = x
    this.#parallaxY = y
    this.#system?.setParallaxOffset(x, y)
  }

  setReducedMotion(prefersReducedMotion: boolean) {
    this.#system?.setReducedMotion(prefersReducedMotion)
  }

  setSceneStyle(sceneStyle: PSceneStyle | undefined) {
    this.#sceneStyle = sceneStyle
    this.#system?.setVisible(sceneStyle !== 'scribble')
  }

  start() {
    this.#started = true
    this.#system?.start()
  }

  destroy() {
    if (this.#destroyed) {
      return
    }

    this.#destroyed = true
    this.#system?.destroy()
    this.#system = null
    releaseTextureGroup(this.#leases)
    this.#leases = []
  }

  async #load() {
    const leases = await acquireTextureGroup(STEAM_SOURCES)

    if (this.#destroyed) {
      releaseTextureGroup(leases)
      return
    }

    let system: SteamParticleSystem | null = null

    try {
      system = new SteamParticleSystem({
        onRender: this.#onRender,
        prefersReducedMotion: this.#getPrefersReducedMotion(),
        textures: leases.map((lease) => lease.texture),
      })
      system.setVisible(this.#sceneStyle !== 'scribble')
      system.setParallaxOffset(this.#parallaxX, this.#parallaxY)
      this.#stage.addChild(system.container)

      if (this.#started) {
        system.start()
      }
    } catch (error: unknown) {
      system?.destroy()
      releaseTextureGroup(leases)
      throw error
    }

    this.#leases = leases
    this.#system = system
  }
}
