import {Container, type Renderer, RenderTexture, Sprite} from 'pixi.js'
import {describe, expect, test, vi} from 'vitest'
import {getVertexBounds, renderRuntimeMask} from '../part-mask'
import type {RuntimePartMask} from '../types'

describe('getVertexBounds', () => {
  test('should bound the interleaved coordinates of every vertex array', () => {
    expect(getVertexBounds([new Float32Array([4, -2, 10, 6]), [-3.5, 8]])).toEqual({
      bottom: 8,
      left: -3.5,
      right: 10,
      top: -2,
    })
  })
  test('should leave the origin of an axis without coordinates undefined', () => {
    expect(getVertexBounds([])).toEqual({
      bottom: Number.NEGATIVE_INFINITY,
      left: undefined,
      right: Number.NEGATIVE_INFINITY,
      top: undefined,
    })
  })
  test('should bound more coordinates than a spread call accepts', () => {
    const vertices = new Float32Array(400_000).map((_, index) => index)
    expect(() => Math.min(...vertices)).toThrow(RangeError)
    expect(getVertexBounds([vertices])).toEqual({
      bottom: 399_999,
      left: 0,
      right: 399_998,
      top: 1,
    })
  })
})

describe('renderRuntimeMask', () => {
  test('should bound mask allocation to the visible document area as zoom changes', () => {
    const texture = RenderTexture.create({dynamic: true, height: 1, width: 1})
    const sprite = new Sprite(texture)
    const render = vi.fn()
    const mask = {
      container: new Container(),
      meshes: [],
      sprite,
      texture,
    } as unknown as RuntimePartMask
    const renderer = {render} as unknown as Renderer
    const vertices = [new Float32Array([0, 0, 6000, 8400])]
    for (const resolution of [0.14, 2, 16, 64]) {
      const viewport = {height: 842 / resolution, width: 600 / resolution, x: 2500.1, y: 3500.2}
      renderRuntimeMask({mask, renderer, resolution, vertexSets: vertices, viewport})
      expect(texture.source.pixelWidth).toBeLessThanOrEqual(600 + 64)
      expect(texture.source.pixelHeight).toBeLessThanOrEqual(842 + 64)
      expect(texture.width).toBeCloseTo(texture.source.width)
      expect(texture.height).toBeCloseTo(texture.source.height)
      expect(sprite.x).toBeLessThanOrEqual(viewport.x)
      expect(sprite.x + texture.width).toBeGreaterThanOrEqual(
        Math.min(6000, viewport.x + viewport.width),
      )
      expect(sprite.y).toBeLessThanOrEqual(viewport.y)
      expect(sprite.y + texture.height).toBeGreaterThanOrEqual(
        Math.min(8400, viewport.y + viewport.height),
      )
    }
    expect(render).toHaveBeenCalledTimes(4)
    sprite.destroy()
    texture.destroy(true)
    mask.container.destroy()
  })
})
