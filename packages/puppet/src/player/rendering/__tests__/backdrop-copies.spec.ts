import {
  Bounds,
  FilterSystem,
  RenderTarget,
  RenderTexture,
  TexturePool,
  type WebGLRenderer,
} from 'pixi.js'
import {describe, expect, test, vi} from 'vitest'
import {configureBackdropCopies} from '../backdrop-copies'

const createFilter = () => {
  const copyToTexture = vi.fn()
  const filter = new FilterSystem({renderTarget: {copyToTexture}} as unknown as WebGLRenderer)
  configureBackdropCopies(filter)
  return {copyToTexture, filter}
}

describe('configureBackdropCopies', () => {
  test.each([
    {resolution: 0.18, x: 32, y: 55},
    {resolution: 0.16833333333333333, x: 11, y: 22},
  ])('should retain pixel-aligned copy origins at $resolution resolution', ({resolution, x, y}) => {
    const {copyToTexture, filter} = createFilter()
    const texture = RenderTexture.create({height: 1000, resolution, width: 1000})
    const surface = new RenderTarget({colorTextures: [texture]})
    const bounds = new Bounds(
      x / resolution,
      y / resolution,
      (x + 16) / resolution,
      (y + 17) / resolution,
    )
    const back = filter.getBackTexture(surface, bounds)
    expect(copyToTexture).toHaveBeenCalledWith(
      surface,
      back,
      {x, y},
      {height: 17, width: 16},
      {x: 0, y: 0},
    )
    TexturePool.returnTexture(back)
    surface.destroy()
    texture.destroy(true)
  })

  test('should floor genuine subpixel origins without rounding them to the next pixel', () => {
    const {copyToTexture, filter} = createFilter()
    const texture = RenderTexture.create({height: 100, resolution: 0.25, width: 100})
    const surface = new RenderTarget({colorTextures: [texture]})
    const back = filter.getBackTexture(surface, new Bounds(7.998, 15.998, 71.998, 83.998))
    expect(copyToTexture).toHaveBeenCalledWith(
      surface,
      back,
      {x: 1, y: 3},
      {height: 17, width: 16},
      {x: 0, y: 0},
    )
    TexturePool.returnTexture(back)
    surface.destroy()
    texture.destroy(true)
  })

  test('should retain aligned origins relative to an enclosing filter', () => {
    const {copyToTexture, filter} = createFilter()
    const resolution = 0.18
    const texture = RenderTexture.create({height: 1000, resolution, width: 1000})
    const surface = new RenderTarget({colorTextures: [texture]})
    const bounds = new Bounds(32 / resolution, 55 / resolution, 48 / resolution, 72 / resolution)
    const parent = new Bounds(9 / resolution, 7 / resolution, 1000, 1000)
    const back = filter.getBackTexture(surface, bounds, parent)
    expect(copyToTexture).toHaveBeenCalledWith(
      surface,
      back,
      {x: 23, y: 48},
      {height: 17, width: 16},
      {x: 0, y: 0},
    )
    TexturePool.returnTexture(back)
    surface.destroy()
    texture.destroy(true)
  })

  test('should match pooled texture rounding at fractional display resolutions', () => {
    const {copyToTexture, filter} = createFilter()
    const resolution = 0.265
    const texture = RenderTexture.create({height: 100, resolution, width: 100})
    const surface = new RenderTarget({colorTextures: [texture]})
    const bounds = new Bounds(0, 0, (16 + Number.EPSILON * 16) / resolution, 15 / resolution)
    const back = filter.getBackTexture(surface, bounds)
    expect(copyToTexture).toHaveBeenCalledWith(
      surface,
      back,
      {x: 0, y: 0},
      {height: 15, width: 16},
      {x: 0, y: 0},
    )
    expect(back.source.pixelWidth).toBe(16)
    TexturePool.returnTexture(back)
    surface.destroy()
    texture.destroy(true)
  })

  test('should retain real fractional pixels and the enclosing filter offset', () => {
    const {copyToTexture, filter} = createFilter()
    const texture = RenderTexture.create({height: 100, resolution: 0.25, width: 100})
    const surface = new RenderTarget({colorTextures: [texture]})
    const bounds = new Bounds(20, 30, 85, 96)
    const back = filter.getBackTexture(surface, bounds, new Bounds(12, 14, 100, 100))
    expect(copyToTexture).toHaveBeenCalledWith(
      surface,
      back,
      {x: 2, y: 4},
      {height: 17, width: 17},
      {x: 0, y: 0},
    )
    expect(back.source.pixelWidth).toBeGreaterThanOrEqual(17)
    TexturePool.returnTexture(back)
    surface.destroy()
    texture.destroy(true)
  })
})
