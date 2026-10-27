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
