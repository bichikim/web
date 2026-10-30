import {Container, MeshSimple, type Renderer, RenderTexture, Sprite, Texture} from 'pixi.js'
import {describe, expect, test, vi} from 'vitest'
import {
  createRuntimePartMask,
  destroyRuntimeMask,
  getVertexBounds,
  renderRuntimeMask,
} from '../part-mask'
import {createEmptyDocument} from '../../create-empty-document'
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
    const source = new MeshSimple({
      indices: new Uint32Array([0, 1, 2]),
      texture: Texture.WHITE,
      uvs: new Float32Array([0, 0, 1, 0, 0, 1]),
      vertices: new Float32Array([0, 0, 6000, 0, 0, 8400]),
    })
    const container = new Container()
    container.addChild(source)
    const render = vi.fn()
    const mask = {
      container,
      meshes: [{mesh: source, sourcePartId: 'source'}],
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
    mask.container.destroy({children: true})
  })
})

describe('createRuntimePartMask', () => {
  test('should keep empty mask sources out of GPU batches', () => {
    const part = {
      id: 'auxiliary',
      mesh: {indices: [], uvs: [0, 0], vertices: [0, 0]},
      texture: {height: 1, src: '', width: 1},
    }
    const source = new MeshSimple({
      indices: new Uint32Array(),
      texture: Texture.WHITE,
      uvs: new Float32Array([0, 0]),
      vertices: new Float32Array([0, 0]),
    })
    const mask = createRuntimePartMask({
      document: {...createEmptyDocument(), parts: [part]},
      partById: new Map([
        [
          part.id,
          {
            mesh: source,
            partId: part.id,
            restVertices: part.mesh.vertices,
            vertices: new Float32Array(part.mesh.vertices),
          },
        ],
      ]),
      plan: {sources: [{invertedMask: false, partId: part.id}]},
    })
    expect(mask.meshes).toHaveLength(1)
    expect(mask.meshes[0]?.mesh.renderable).toBe(false)
    destroyRuntimeMask(mask)
    source.destroy()
  })
})

test('should retain a cleared one-pixel target for an empty mask across viewport changes', () => {
  const part = {
    id: 'empty',
    mesh: {indices: [], uvs: [0, 0], vertices: [0, 0]},
    texture: {height: 1, src: '', width: 1},
  }
  const source = new MeshSimple({
    indices: new Uint32Array(),
    texture: Texture.WHITE,
    uvs: new Float32Array([0, 0]),
    vertices: new Float32Array([0, 0]),
  })
  const mask = createRuntimePartMask({
    document: {...createEmptyDocument(), parts: [part]},
    partById: new Map([
      [
        'empty',
        {
          mesh: source,
          partId: 'empty',
          restVertices: part.mesh.vertices,
          vertices: new Float32Array(source.vertices),
        },
      ],
    ]),
    plan: {sources: [{invertedMask: false, partId: 'empty'}]},
  })
  const render = vi.fn()
  const renderer = {render} as unknown as Renderer
  for (const resolution of [0.25, 2, 16]) {
    renderRuntimeMask({mask, renderer, resolution, vertexSets: [[0, 0, 6000, 8400]]})
  }
  expect(render).toHaveBeenCalledTimes(1)
  expect(mask.texture.source.pixelWidth).toBe(1)
  expect(mask.texture.source.pixelHeight).toBe(1)
  const other = vi.fn()
  renderRuntimeMask({
    mask,
    renderer: {render: other} as unknown as Renderer,
    resolution: 1,
    vertexSets: [[0, 0, 10, 10]],
  })
  expect(other).toHaveBeenCalledTimes(1)
  destroyRuntimeMask(mask)
  source.destroy()
})

test('should retain active capacity at one resolution and resize when the resolution changes', () => {
  const vertices = [0, 0, 100, 0, 0, 100]
  const part = {
    id: 'source',
    mesh: {indices: [0, 1, 2], uvs: [0, 0, 1, 0, 0, 1], vertices},
    texture: {height: 1, src: '', width: 1},
  }
  const source = new MeshSimple({
    indices: new Uint32Array(part.mesh.indices),
    texture: Texture.WHITE,
    uvs: new Float32Array(part.mesh.uvs),
    vertices: new Float32Array(vertices),
  })
  const mask = createRuntimePartMask({
    document: {...createEmptyDocument(), parts: [part]},
    partById: new Map([
      [
        'source',
        {
          mesh: source,
          partId: 'source',
          restVertices: vertices,
          vertices: new Float32Array(source.vertices),
        },
      ],
    ]),
    plan: {sources: [{invertedMask: false, partId: 'source'}]},
  })
  const renderer = {render: vi.fn()} as unknown as Renderer
  renderRuntimeMask({mask, renderer, resolution: 1, vertexSets: [[0, 0, 100, 100]]})
  const width = mask.texture.source.pixelWidth
  renderRuntimeMask({mask, renderer, resolution: 1, vertexSets: [[0, 0, 40, 40]]})
  expect(mask.texture.source.pixelWidth).toBe(width)
  renderRuntimeMask({mask, renderer, resolution: 0.5, vertexSets: [[0, 0, 40, 40]]})
  expect(mask.texture.source.resolution).toBe(0.5)
  expect(mask.texture.source.pixelWidth).toBeLessThan(width)
  destroyRuntimeMask(mask)
  source.destroy()
})
