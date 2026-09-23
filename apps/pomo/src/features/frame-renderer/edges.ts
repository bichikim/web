import {BlurFilter, Container, Rectangle, type Renderer, Sprite, Texture} from 'pixi.js'

const SAMPLE_LENGTH = 256
const EDGE_FRACTION = 0.08
const BLUR_STRENGTH = 5
const BLUR_QUALITY = 2

export interface PhotoEdgeCompanion {
  readonly texture: Texture
  readonly direction: 'horizontal' | 'vertical'
}

export interface PhotoEdgesOptions {
  readonly renderer: Renderer
  readonly texture: Texture
}

export interface PhotoEdgesLayout {
  readonly width: number
  readonly height: number
  readonly photoWidth: number
  readonly photoHeight: number
  readonly companion?: PhotoEdgeCompanion
}

/** Owns a cached blur of the photo extended to the viewport, borrowing the original texture. */
export class PhotoEdges {
  readonly view = new Container()
  readonly #options: PhotoEdgesOptions
  #layout = ''
  #companion: Texture | null = null

  constructor(options: PhotoEdgesOptions) {
    this.#options = options
  }

  resize(options: PhotoEdgesLayout) {
    const {width, height, photoWidth, photoHeight, companion} = options
    const layout = `${width}:${height}:${photoWidth}:${photoHeight}:${companion?.direction}`
    if (layout === this.#layout && (companion?.texture ?? null) === this.#companion) {
      return
    }
    const horizontal = Math.max(0, (width - photoWidth) / 2)
    const vertical = Math.max(0, (height - photoHeight) / 2)
    if (horizontal === 0 && vertical === 0) {
      this.#clear()
      this.#companion = companion?.texture ?? null
      this.#layout = layout
      return
    }
    const background = this.#generate(options)
    this.#clear()
    this.view.addChild(background)
    this.#companion = companion?.texture ?? null
    this.#layout = layout
  }

  #generate({width, height, photoWidth, photoHeight, companion}: PhotoEdgesLayout) {
    const {texture, renderer} = this.#options
    const horizontal = Math.max(0, (width - photoWidth) / 2)
    const vertical = Math.max(0, (height - photoHeight) / 2)
    const right = companion?.direction === 'horizontal' ? companion.texture : texture
    const bottom = companion?.direction === 'vertical' ? companion.texture : texture
    const stripWidth = Math.max(1, texture.width * EDGE_FRACTION)
    const stripHeight = Math.max(1, texture.height * EDGE_FRACTION)
    const rightWidth = Math.max(1, right.width * EDGE_FRACTION)
    const bottomHeight = Math.max(1, bottom.height * EDGE_FRACTION)
    const firstWidth =
      companion?.direction === 'horizontal'
        ? (photoHeight * texture.width) / texture.height
        : photoWidth
    const firstHeight =
      companion?.direction === 'vertical'
        ? (photoWidth * texture.height) / texture.width
        : photoHeight
    const regions = [
      {
        area: new Rectangle(0, 0, horizontal, height),
        source: new Rectangle(0, 0, stripWidth, texture.height),
        texture,
      },
      {
        area: new Rectangle(width - horizontal, 0, horizontal, height),
        source: new Rectangle(right.width - rightWidth, 0, rightWidth, right.height),
        texture: right,
      },
      {
        area: new Rectangle(0, 0, width, vertical),
        source: new Rectangle(0, 0, texture.width, stripHeight),
        texture,
      },
      {
        area: new Rectangle(0, height - vertical, width, vertical),
        source: new Rectangle(0, bottom.height - bottomHeight, bottom.width, bottomHeight),
        texture: bottom,
      },
      {
        area: new Rectangle(horizontal, vertical, firstWidth, firstHeight),
        source: new Rectangle(0, 0, texture.width, texture.height),
        texture,
      },
    ]
    if (companion !== undefined) {
      const sideBySide = companion.direction === 'horizontal'
      regions.push({
        area: new Rectangle(
          horizontal + (sideBySide ? firstWidth : 0),
          vertical + (sideBySide ? 0 : firstHeight),
          sideBySide ? photoWidth - firstWidth : photoWidth,
          sideBySide ? photoHeight : photoHeight - firstHeight,
        ),
        source: new Rectangle(0, 0, companion.texture.width, companion.texture.height),
        texture: companion.texture,
      })
    }
    const composite = new Container()
    const crops: Texture[] = []
    try {
      for (const {source, area, texture: regionTexture} of regions) {
        if (area.width > 0 && area.height > 0) {
          const crop = new Texture({frame: source, source: regionTexture.source})
          crops.push(crop)
          const sprite = new Sprite(crop)
          sprite.position.set(area.x, area.y)
          sprite.width = area.width
          sprite.height = area.height
          composite.addChild(sprite)
        }
      }
      const resolution = Math.min(1, SAMPLE_LENGTH / Math.max(width, height))
      // Rasterize the extended photo before blurring so the blur uses viewport proportions.
      const stretched = renderer.generateTexture({
        frame: new Rectangle(0, 0, width, height),
        resolution,
        target: composite,
      })
      return this.#blur(stretched, width, height, resolution)
    } finally {
      composite.destroy({children: true})
      for (const crop of crops) {
        crop.destroy(false)
      }
    }
  }

  #blur(stretched: Texture, width: number, height: number, resolution: number) {
    const sample = new Sprite(stretched)
    sample.width = width * resolution
    sample.height = height * resolution
    const filter = new BlurFilter({quality: BLUR_QUALITY, resolution: 1, strength: BLUR_STRENGTH})
    filter.repeatEdgePixels = true
    sample.filters = [filter]
    try {
      const blurred = this.#options.renderer.generateTexture({
        frame: new Rectangle(0, 0, sample.width, sample.height),
        resolution: 1,
        target: sample,
      })
      const background = new Sprite(blurred)
      background.width = width
      background.height = height
      return background
    } finally {
      sample.destroy()
      stretched.destroy(true)
      filter.destroy()
    }
  }

  #clear() {
    for (const sprite of this.view.removeChildren()) {
      sprite.destroy({texture: true, textureSource: true})
    }
  }

  destroy() {
    this.#clear()
    this.view.destroy()
  }
}
