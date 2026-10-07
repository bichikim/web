import {Container, Rectangle, Sprite, Texture} from 'pixi.js'

export interface TextureRegion {
  readonly area: Rectangle
  readonly source: Rectangle
  readonly texture: Texture
}

export interface CreateTextureRegionsOptions {
  readonly regions: ReadonlyArray<TextureRegion>
}

export interface TextureRegions {
  readonly dispose: () => void
  readonly view: Container
}

const disposeRegions = (
  view: Container,
  sprites: ReadonlyArray<Sprite>,
  crops: ReadonlyArray<Texture>,
): void => {
  let failed = false
  let failure: unknown
  const release = (operation: () => void): void => {
    try {
      operation()
    } catch (error: unknown) {
      if (!failed) {
        failed = true
        failure = error
      }
    }
  }

  release(() => view.destroy({children: true}))
  for (const sprite of sprites) {
    if (!sprite.destroyed) {
      release(() => sprite.destroy())
    }
  }
  for (const crop of crops) {
    release(() => crop.destroy(false))
  }
  if (failed) {
    // oxlint-disable-next-line eslint/no-throw-literal -- Preserve the first thrown value, including undefined.
    throw failure
  }
}

/**
 * Creates an owned, ordered layer of source-frame crops scaled and placed in destination areas.
 * Source frames use absolute TextureSource coordinates; nonpositive/NaN areas are omitted.
 * Input textures and their sources are borrowed. Borrow the view for rendering without changing its children.
 * Disposal is attempted once, releasing children before crops and throwing the first cleanup failure.
 * Construction failures roll back acquired resources; cleanup failures take precedence.
 */
export const createTextureRegions = (options: CreateTextureRegionsOptions): TextureRegions => {
  const view = new Container()
  const crops: Texture[] = []
  const sprites: Sprite[] = []
  let disposed = false
  const dispose = (): void => {
    if (disposed) {
      return
    }
    disposed = true
    try {
      disposeRegions(view, sprites, crops)
    } finally {
      sprites.length = 0
      crops.length = 0
    }
  }

  try {
    for (const {source, area, texture: regionTexture} of options.regions) {
      if (area.width > 0 && area.height > 0) {
        const textureSource = regionTexture.source
        // Snapshot before Texture subscribes to the borrowed source during construction.
        const frame = new Rectangle(source.x, source.y, source.width, source.height)
        const crop = new Texture({frame, source: textureSource})
        crops.push(crop)
        const sprite = new Sprite(crop)
        sprites.push(sprite)
        sprite.position.set(area.x, area.y)
        sprite.width = area.width
        sprite.height = area.height
        view.addChild(sprite)
      }
    }
  } catch (error: unknown) {
    dispose()
    throw error
  }

  return {dispose, view}
}
