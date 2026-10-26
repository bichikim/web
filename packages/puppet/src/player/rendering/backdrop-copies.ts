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
    // PixiJS 8.22's pool ignores floating-point residue, but its backdrop copy does not.
    // At fractional zoom, copying 16.000000000000004 pixels into a 16-pixel texture fails.
    const PIXEL_ROUNDING_TOLERANCE = 1e-6
    const pixels = (size: number) => Math.ceil(size * resolution - PIXEL_ROUNDING_TOLERANCE)
    filter.renderer.renderTarget.copyToTexture(
      surface,
      texture,
      {
        x: Math.floor((bounds.minX - (previousBounds?.minX ?? 0)) * resolution),
        y: Math.floor((bounds.minY - (previousBounds?.minY ?? 0)) * resolution),
      },
      {height: pixels(bounds.height), width: pixels(bounds.width)},
      {x: 0, y: 0},
    )
    return texture
  }
}
