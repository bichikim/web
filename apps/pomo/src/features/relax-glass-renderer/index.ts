export * from './cover-uv'
export * from './glass-light-filter'
export * from './pixi-runtime'
export * from './rain-filter'
export * from './rain-map-eraser'
export * from './rain-render-targets'
export * from './rain-simulation'
import {BlurFilter, Container, Rectangle, Sprite, Texture, type Ticker} from 'pixi.js'

import {DropletEraseFilter} from './droplet-erase-filter'
import {
  GlassLightFilter,
  type GlassLightPositions,
  type VirtualLightPosition,
} from './glass-light-filter'
import {MistEvolutionFilter} from './mist-evolution-filter'
import {GlassPixiRuntime} from './pixi-runtime'
import {RainGlassFilter} from './rain-filter'
import {RainRenderTargets} from './rain-render-targets'
import {RainSimulation} from './rain-simulation'

const RESIDUE_SOURCE = '/slowcove/glass-residue.webp'
const REFLECTION_SOURCE = '/slowcove/interior-reflection.webp'
const RAIN_NORMAL_SOURCE = '/slowcove/glass-raindrop-normal.png'
const MILLISECONDS_PER_SECOND = 1000
const SOURCE_MIST_SECONDS = 10
const DEMO_TIME_SCALE = 1.8
const SPRITE_ANCHOR = 0.5
const DEPTH_PARALLAX_MAXIMUM_X = 12
const DEPTH_PARALLAX_MAXIMUM_Y = 14

/** Owns the GPU scene and its image textures for one glass background. */
export class RelaxGlassRenderer {
  readonly #runtime = new GlassPixiRuntime()
  get #application() {
    return this.#runtime.application
  }
  readonly #canvas: HTMLCanvasElement
  #positions: GlassLightPositions
  readonly #textures: Texture[] = []
  #filter: GlassLightFilter | null = null
  #rainFilter: RainGlassFilter | null = null
  #rainTargets: RainRenderTargets | null = null
  #mistBackdrop: Texture | null = null
  #dropletEraseFilter: DropletEraseFilter | null = null
  #mistEvolutionFilter: MistEvolutionFilter | null = null
  #dropletEraseSprite: Sprite | null = null
  #dropletHistorySprite: Sprite | null = null
  #mistEvolutionSprite: Sprite | null = null
  #mistHistorySprite: Sprite | null = null
  #rainNormal: Texture | null = null
  #rainSimulation: RainSimulation | null = null
  readonly #rainContainer = new Container()
  readonly #dropletContainer = new Container()
  readonly #rainSprites: Sprite[] = []
  readonly #dropletSprites: Sprite[] = []
  #rainEnabled = false
  #mistIntensity = 1
  #depthAvailable = false
  #depthOffset = {x: 0, y: 0}
  #sprite: Sprite | null = null
  #disposed = false
  #elapsed = 0

  constructor(canvas: HTMLCanvasElement, positions: GlassLightPositions) {
    this.#canvas = canvas
    this.#positions = positions
  }

  async initialize(backgroundSource: string, depthSource?: string): Promise<void> {
    if (!(await this.#runtime.initialize(this.#canvas))) {
      return
    }

    try {
      const background = await this.#acquireTexture(backgroundSource)
      const depth =
        depthSource === undefined ? Texture.WHITE : await this.#acquireTexture(depthSource)
      const residue = await this.#acquireTexture(RESIDUE_SOURCE)
      const reflection = await this.#acquireTexture(REFLECTION_SOURCE)
      const rainNormal = await this.#acquireTexture(RAIN_NORMAL_SOURCE)
      if (
        background === null ||
        depth === null ||
        residue === null ||
        reflection === null ||
        rainNormal === null
      ) {
        return
      }

      this.#depthAvailable = depthSource !== undefined
      this.#filter = new GlassLightFilter(
        {backdrop: background, depth, reflection, residue},
        this.#positions,
      )
      this.#initializeRainLayers(background, depth, rainNormal)
      this.#sprite = new Sprite(Texture.WHITE)
      this.#syncWeather()
      this.#application.stage.addChild(this.#sprite)
      this.#application.ticker.maxFPS = 60
      this.#application.ticker.add(this.#updateLight)
      this.#runtime.attachEnvironment(this.#canvas, this.#resize, this.#syncMotion)
      this.#resize()
      this.setDepthOffset(this.#depthOffset.x, this.#depthOffset.y)
      this.#syncMotion()
    } catch (error: unknown) {
      this.destroy()
      throw error
    }
  }

  #initializeRainLayers(background: Texture, depth: Texture, rainNormal: Texture) {
    const mistBackdrop = this.#createMistBackdrop(background)
    this.#mistBackdrop = mistBackdrop
    const targets = RainRenderTargets.create()
    this.#rainTargets = targets
    this.#rainFilter = new RainGlassFilter({
      backdrop: background,
      depth,
      dropletMap: targets.droplet,
      mistBackdrop,
      mistMap: targets.mist,
      rainMap: targets.rain,
    })
    this.#rainFilter.setMistIntensity(this.#mistIntensity)
    this.#dropletEraseFilter = new DropletEraseFilter(targets.droplet, targets.rain)
    this.#dropletEraseSprite = new Sprite(Texture.WHITE)
    this.#dropletEraseSprite.filters = [this.#dropletEraseFilter]
    this.#dropletHistorySprite = new Sprite(targets.dropletHistory)
    this.#dropletContainer.addChild(this.#dropletHistorySprite)
    this.#mistEvolutionFilter = new MistEvolutionFilter(targets.mist, targets.rain)
    this.#mistEvolutionSprite = new Sprite(Texture.WHITE)
    this.#mistEvolutionSprite.filters = [this.#mistEvolutionFilter]
    this.#mistHistorySprite = new Sprite(targets.mistHistory)
    this.#rainNormal = rainNormal
    this.#rainSimulation = new RainSimulation(1, 1)
  }

  #createMistBackdrop(background: Texture): Texture {
    const mistBackdropSprite = new Sprite(background)
    const mistBlur = new BlurFilter({quality: 4, resolution: 0.5, strength: 24})
    mistBlur.repeatEdgePixels = true
    mistBackdropSprite.filters = [mistBlur]
    try {
      return this.#application.renderer.generateTexture({
        frame: new Rectangle(0, 0, background.width, background.height),
        resolution: 0.5,
        target: mistBackdropSprite,
      })
    } finally {
      mistBackdropSprite.filters = []
      mistBlur.blurXFilter.destroy()
      mistBlur.blurYFilter.destroy()
      mistBlur.destroy()
      mistBackdropSprite.destroy()
    }
  }

  async #acquireTexture(source: string): Promise<Texture | null> {
    const texture = await this.#runtime.loadTexture(source)
    if (this.#disposed) {
      texture.destroy(true)
      return null
    }
    this.#textures.push(texture)
    return texture
  }

  setDaylightPosition(position: VirtualLightPosition) {
    if (this.#disposed) {
      return
    }
    this.#positions = {...this.#positions, daylight: position}
    this.#filter?.setDaylightPosition(position)
    if (this.#filter !== null && !this.#application.ticker.started) {
      this.#application.render()
    }
  }

  setRainEnabled(enabled: boolean) {
    if (this.#disposed || this.#rainEnabled === enabled) {
      return
    }
    this.#rainEnabled = enabled
    this.#syncWeather()
    if (this.#runtime.initialized && !this.#application.ticker.started) {
      this.#application.render()
    }
  }

  setMistIntensity(intensity: number) {
    if (this.#disposed || !Number.isFinite(intensity)) {
      return
    }
    this.#mistIntensity = Math.min(1, Math.max(0, intensity))
    this.#rainFilter?.setMistIntensity(this.#mistIntensity)
    if (this.#runtime.initialized && !this.#application.ticker.started) {
      this.#application.render()
    }
  }

  setDepthOffset(x: number, y: number) {
    if (this.#disposed || !Number.isFinite(x) || !Number.isFinite(y)) {
      return
    }
    this.#depthOffset = {x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y))}
    const horizontal = this.#depthAvailable ? this.#depthOffset.x * DEPTH_PARALLAX_MAXIMUM_X : 0
    const vertical = this.#depthAvailable ? this.#depthOffset.y * DEPTH_PARALLAX_MAXIMUM_Y : 0
    this.#filter?.setParallaxOffset(horizontal, vertical)
    this.#rainFilter?.setParallaxOffset(horizontal, vertical)
    if (this.#runtime.initialized && !this.#application.ticker.started) {
      this.#application.render()
    }
  }

  #syncWeather() {
    if (this.#sprite === null) {
      return
    }
    const filter = this.#rainEnabled ? this.#rainFilter : this.#filter
    this.#sprite.filters = filter === null ? [] : [filter]
  }

  readonly #resize = () => {
    if (this.#disposed) {
      return
    }
    const width = Math.max(1, this.#canvas.clientWidth)
    const height = Math.max(1, this.#canvas.clientHeight)
    if (
      width === this.#application.renderer.screen.width &&
      height === this.#application.renderer.screen.height
    ) {
      return
    }
    this.#application.renderer.resize(width, height)
    this.#resetRainState(width, height)
    if (this.#sprite !== null && this.#filter !== null) {
      this.#sprite.width = width
      this.#sprite.height = height
      this.#filter.setViewport(width, height)
      this.#rainFilter?.setViewport(width, height)
    }
    for (const sprite of [
      this.#dropletEraseSprite,
      this.#dropletHistorySprite,
      this.#mistEvolutionSprite,
      this.#mistHistorySprite,
    ]) {
      if (sprite !== null) {
        sprite.width = width
        sprite.height = height
      }
    }
    this.#renderRainMap()
    this.#renderDropletMap()
    this.#renderMistMap(0)
    this.#application.render()
  }

  #resetRainState(width: number, height: number) {
    this.#rainSimulation = new RainSimulation(width, height)
    for (const sprite of this.#rainSprites) {
      this.#rainContainer.removeChild(sprite)
      sprite.destroy()
    }
    for (const sprite of this.#dropletSprites) {
      this.#dropletContainer.removeChild(sprite)
      sprite.destroy()
    }
    this.#rainSprites.length = 0
    this.#dropletSprites.length = 0
    const targets = this.#rainTargets
    if (targets !== null) {
      targets.resize(width, height)
      this.#application.renderer.render({
        clear: true,
        container: this.#rainContainer,
        target: targets.droplet,
      })
      this.#application.renderer.render({
        clear: true,
        container: this.#rainContainer,
        target: targets.mist,
      })
    }
  }

  readonly #updateLight = (ticker: Ticker) => {
    const elapsedSeconds = ticker.elapsedMS / MILLISECONDS_PER_SECOND
    if (this.#rainEnabled) {
      this.#rainSimulation?.step(elapsedSeconds)
      this.#renderRainMap()
      this.#renderDropletMap()
      this.#renderMistMap((elapsedSeconds * DEMO_TIME_SCALE) / SOURCE_MIST_SECONDS)
      return
    }
    this.#elapsed += elapsedSeconds
    this.#filter?.setTime(this.#elapsed)
  }

  #renderRainMap() {
    const targets = this.#rainTargets
    if (targets === null || this.#rainNormal === null || this.#rainSimulation === null) {
      return
    }
    const {drops} = this.#rainSimulation
    for (let index = 0; index < drops.length; index += 1) {
      const drop = drops[index]
      const sprite = this.#rainSprites[index] ?? new Sprite(this.#rainNormal)
      if (this.#rainSprites[index] === undefined) {
        sprite.anchor.set(SPRITE_ANCHOR)
        sprite.blendMode = 'exclusion'
        this.#rainSprites.push(sprite)
        this.#rainContainer.addChild(sprite)
      }
      sprite.position.set(drop.x, drop.y)
      sprite.width = drop.width
      sprite.height = drop.height
      sprite.visible = true
    }
    for (let index = drops.length; index < this.#rainSprites.length; index += 1) {
      this.#rainSprites[index].visible = false
    }
    this.#application.renderer.render({
      clear: true,
      container: this.#rainContainer,
      target: targets.rain,
    })
  }

  #renderDropletMap() {
    const targets = this.#rainTargets
    if (
      targets === null ||
      this.#dropletEraseSprite === null ||
      this.#rainNormal === null ||
      this.#rainSimulation === null
    ) {
      return
    }
    this.#application.renderer.render({
      clear: true,
      container: this.#dropletEraseSprite,
      target: targets.dropletHistory,
    })
    const droplets = this.#rainSimulation.newDroplets
    for (let index = 0; index < droplets.length; index += 1) {
      const droplet = droplets[index]
      const sprite = this.#dropletSprites[index] ?? new Sprite(this.#rainNormal)
      if (this.#dropletSprites[index] === undefined) {
        sprite.anchor.set(SPRITE_ANCHOR)
        sprite.blendMode = 'exclusion'
        this.#dropletSprites.push(sprite)
        this.#dropletContainer.addChild(sprite)
      }
      sprite.position.set(droplet.x, droplet.y)
      sprite.width = droplet.size
      sprite.height = droplet.size
      sprite.visible = true
    }
    for (let index = droplets.length; index < this.#dropletSprites.length; index += 1) {
      this.#dropletSprites[index].visible = false
    }
    this.#application.renderer.render({
      clear: true,
      container: this.#dropletContainer,
      target: targets.droplet,
    })
  }

  #renderMistMap(growth: number) {
    const targets = this.#rainTargets
    if (
      targets === null ||
      this.#mistEvolutionFilter === null ||
      this.#mistEvolutionSprite === null ||
      this.#mistHistorySprite === null
    ) {
      return
    }
    this.#mistEvolutionFilter.setGrowth(growth)
    this.#application.renderer.render({
      clear: true,
      container: this.#mistEvolutionSprite,
      target: targets.mistHistory,
    })
    this.#application.renderer.render({
      clear: true,
      container: this.#mistHistorySprite,
      target: targets.mist,
    })
  }

  readonly #syncMotion = () => {
    if (this.#disposed) {
      return
    }
    if (this.#runtime.isMotionPaused()) {
      this.#application.stop()
      this.#application.render()
      return
    }
    this.#application.start()
  }

  destroy() {
    if (this.#disposed) {
      return
    }
    this.#disposed = true
    if (this.#sprite !== null) {
      this.#sprite.filters = []
    }
    this.#filter?.destroy()
    this.#rainFilter?.destroy()
    this.#dropletEraseFilter?.destroy()
    this.#mistEvolutionFilter?.destroy()
    this.#dropletEraseSprite?.destroy()
    this.#mistEvolutionSprite?.destroy()
    this.#mistHistorySprite?.destroy()
    this.#rainContainer.destroy({children: true})
    this.#dropletContainer.destroy({children: true})
    this.#rainTargets?.destroy()
    this.#mistBackdrop?.destroy(true)
    this.#runtime.destroy()
    for (const texture of this.#textures) {
      texture.destroy(true)
    }
    this.#textures.length = 0
    this.#filter = null
    this.#sprite = null
  }
}
