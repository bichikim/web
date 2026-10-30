import {type FilterSystem, TexturePool} from 'pixi.js'

/** Uses the texture pool's physical-pixel rounding when copying filter backdrops. */
export const configureBackdropCopies = (filter: FilterSystem): void => {
  filter.getBackTexture = (surface, bounds, previousBounds) => {
    const {resolution} = surface
    const texture = TexturePool.getOptimalTexture({
      height: bounds.height,
      resolution,
      width: bounds.width,
    })
    // Filter bounds are pixel-aligned, but converting them back can leave floating-point
    // residue. Round sizes outwards and origins downwards without losing an aligned pixel.
    const PIXEL_ROUNDING_TOLERANCE = 1e-6
    const pixels = (size: number) => Math.ceil(size * resolution - PIXEL_ROUNDING_TOLERANCE)
    const origin = (position: number) =>
      Math.floor(position * resolution + PIXEL_ROUNDING_TOLERANCE)
    filter.renderer.renderTarget.copyToTexture(
      surface,
      texture,
      {
        x: origin(bounds.minX - (previousBounds?.minX ?? 0)),
        y: origin(bounds.minY - (previousBounds?.minY ?? 0)),
      },
      {height: pixels(bounds.height), width: pixels(bounds.width)},
      {x: 0, y: 0},
    )
    return texture
  }
}
