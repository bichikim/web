import {
  Application,
  Container,
  PerspectiveMesh,
  RenderTexture,
  Sprite,
  Text,
  Texture,
} from 'pixi.js'
import {TarotDepthFilter} from './depth-filter'
import {projectCard} from './project-card'
import {TarotReflectionFilter} from './reflection-filter'

const MAXIMUM_RENDER_RESOLUTION = 1.5
const CARD_SIZE = {height: 1536, width: 1024} as const
const LABEL_LAYOUT = {
  anchor: 0.5,
  centerX: 512,
  markerY: 66,
  maximumNameWidth: 716,
  nameY: 1367,
} as const

interface TarotDepthOptions {
  readonly canvas: HTMLCanvasElement
  readonly image: string
  readonly frame: string
  readonly depth: string
  readonly marker: string
  readonly name: string
}

interface TarotDepthFrame {
  readonly reversed: boolean
  readonly width: number
  readonly height: number
  readonly x: number
  readonly y: number
}

/** Owns one enlarged card's textures and on-demand Pixi rendering. */
export class TarotDepthRenderer {
  readonly #application = new Application()
  readonly #composition = new Container()
  readonly #textures: Texture[] = []
  #filter: TarotDepthFilter | null = null
  #reflection: TarotReflectionFilter | null = null
  #surface: RenderTexture | null = null
  #mesh: PerspectiveMesh | null = null
  #initialized = false
  #disposed = false

  async initialize(options: TarotDepthOptions): Promise<boolean> {
    try {
      await this.#application.init({
        antialias: true,
        autoDensity: false,
        autoStart: false,
        backgroundAlpha: 0,
        canvas: options.canvas,
        height: 1,
        preference: 'webgl',
        resolution: Math.min(globalThis.devicePixelRatio || 1, MAXIMUM_RENDER_RESOLUTION),
        width: 1,
      })
      this.#initialized = true
      if (this.#disposed) {
        this.#application.destroy(false, {children: true})
        return false
      }
      const [image, depth, frame] = await Promise.all([
        this.#loadTexture(options.image),
        this.#loadTexture(options.depth),
        this.#loadTexture(options.frame),
      ])
      if (this.#disposed || image === null || depth === null || frame === null) {
        return false
      }
      const sprite = new Sprite(image)
      sprite.width = CARD_SIZE.width
      sprite.height = CARD_SIZE.height
      this.#filter = new TarotDepthFilter(depth)
      sprite.filters = [this.#filter]
      const border = new Sprite(frame)
      border.width = CARD_SIZE.width
      border.height = CARD_SIZE.height
      const face = new Container()
      face.addChild(sprite, border)
      this.#reflection = new TarotReflectionFilter()
      face.filters = [this.#reflection]
      this.#composeCard(options, face)
      this.#surface = RenderTexture.create({height: 1536, width: 1024})
      this.#mesh = new PerspectiveMesh({texture: this.#surface, verticesX: 16, verticesY: 24})
      this.#application.stage.addChild(this.#mesh)
      return true
    } catch (error: unknown) {
      if (!this.#initialized && this.#application.renderer !== undefined) {
        this.#application.destroy(false, {children: true})
      }
      this.destroy()
      throw error
    }
  }

  render(frame: TarotDepthFrame) {
    if (
      this.#disposed ||
      this.#mesh === null ||
      this.#surface === null ||
      this.#filter === null ||
      this.#reflection === null
    ) {
      return
    }
    const application = this.#application
    if (application.screen.width !== frame.width || application.screen.height !== frame.height) {
      application.renderer.resize(frame.width, frame.height)
    }
    this.#filter.setOffset(frame.x, frame.y)
    this.#reflection.setOrientation({reversed: frame.reversed, x: frame.x, y: frame.y})
    application.renderer.render({clear: true, container: this.#composition, target: this.#surface})
    this.#mesh.setCorners(...projectCard(frame))
    application.render()
  }

  destroy() {
    if (this.#disposed) {
      return
    }
    this.#disposed = true
    if (this.#initialized) {
      this.#application.destroy(false, {children: true})
    }
    this.#composition.destroy({children: true})
    this.#filter?.destroy()
    this.#reflection?.destroy()
    this.#surface?.destroy(true)
    for (const texture of this.#textures) {
      texture.destroy(true)
    }
    this.#textures.length = 0
  }

  #composeCard(options: TarotDepthOptions, face: Container) {
    const typography = globalThis.getComputedStyle(options.canvas)
    const {fontFamily, fontSize} = typography
    const markerRatio = Number.parseFloat(typography.getPropertyValue('--tarot-marker-ratio'))
    // Convert CSS typography to texture coordinates so resizing preserves the card's proportions.
    const labelSize = (Number.parseFloat(fontSize) * CARD_SIZE.width) / options.canvas.clientWidth
    const marker = new Text({
      style: {fill: '#56391f', fontFamily, fontSize: labelSize * markerRatio, fontWeight: '700'},
      text: options.marker,
    })
    marker.anchor.set(LABEL_LAYOUT.anchor)
    marker.position.set(LABEL_LAYOUT.centerX, LABEL_LAYOUT.markerY)
    const name = new Text({
      style: {fill: '#56391f', fontFamily, fontSize: labelSize, fontWeight: '700'},
      text: options.name,
    })
    name.anchor.set(LABEL_LAYOUT.anchor)
    name.position.set(LABEL_LAYOUT.centerX, LABEL_LAYOUT.nameY)
    name.scale.set(Math.min(1, LABEL_LAYOUT.maximumNameWidth / name.width))
    this.#composition.addChild(face, marker, name)
  }

  async #loadTexture(source: string): Promise<Texture | null> {
    const image = new globalThis.Image()
    image.src = source
    await image.decode()
    if (this.#disposed) {
      return null
    }
    const texture = Texture.from(image)
    this.#textures.push(texture)
    return texture
  }
}
