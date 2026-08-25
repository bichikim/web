import {Container} from 'pixi.js'
import {describe, expect, it} from 'vitest'

import {positionLayerContainer, validateTextureSizes} from '../layer-layout'
import type {PixiLayerSceneDefinition, PixiScenePoint} from '../layer-scene-definition'
import type {TextureLease} from '../texture-leases'

const createDefinition = (
  position: PixiScenePoint | undefined = undefined,
): PixiLayerSceneDefinition => ({
  background: '#000000',
  height: 100,
  id: 'scene',
  layers: [
    {
      id: 'layer',
      ...(position === undefined ? {} : {position}),
      source: 'layer.webp',
    },
  ],
  width: 100,
})

const createLease = (width: number, height: number, source = 'layer.webp') =>
  ({
    release: () => undefined,
    source,
    texture: {height, width},
  }) as unknown as TextureLease

describe('positionLayerContainer', () => {
  it('should preserve a positioned layer origin around a scene-space rotation center', () => {
    const container = new Container()

    positionLayerContainer({
      container,
      pivotMotion: {
        center: {x: 1060, y: 425},
        degrees: 0.5,
        kind: 'pivot-rotation',
        travel: {maximumSeconds: 2.4, minimumSeconds: 1.5},
      },
      position: {x: 809, y: 127},
      size: {height: 381, width: 466},
    })

    expect({x: container.pivot.x, y: container.pivot.y}).toEqual({x: 251, y: 298})
    expect({x: container.position.x, y: container.position.y}).toEqual({x: 1060, y: 425})
  })

  it('should keep full-scene pivot coordinates unchanged without a layer position', () => {
    const container = new Container()

    positionLayerContainer({
      container,
      pivotMotion: {
        center: {x: 1060, y: 425},
        degrees: 0.5,
        kind: 'pivot-rotation',
        travel: {maximumSeconds: 2.4, minimumSeconds: 1.5},
      },
      size: {height: 941, width: 1672},
    })

    expect({x: container.pivot.x, y: container.pivot.y}).toEqual({x: 1060, y: 425})
    expect({x: container.position.x, y: container.position.y}).toEqual({x: 1060, y: 425})
  })

  it('should rotate a positioned layer around its texture center', () => {
    const container = new Container()

    positionLayerContainer({
      container,
      position: {x: 5, y: 7},
      rotationDegrees: 90,
      size: {height: 20, width: 40},
    })

    expect({x: container.pivot.x, y: container.pivot.y}).toEqual({x: 20, y: 10})
    expect({x: container.position.x, y: container.position.y}).toEqual({x: 25, y: 17})
    expect(container.rotation).toBe(Math.PI / 2)
  })

  it('should default a positioned layer rotation to zero', () => {
    const container = new Container()

    positionLayerContainer({
      container,
      position: {x: 0, y: 0},
      size: {height: 20, width: 40},
    })

    expect(container.rotation).toBe(0)
  })

  it('should leave an unpositioned static container unchanged', () => {
    const container = new Container()

    positionLayerContainer({container, size: {height: 20, width: 40}})

    expect({x: container.pivot.x, y: container.pivot.y}).toEqual({x: 0, y: 0})
    expect({x: container.position.x, y: container.position.y}).toEqual({x: 0, y: 0})
    expect(container.rotation).toBe(0)
  })
})

describe('validateTextureSizes', () => {
  it('should allow exact full-scene and exact positioned boundary dimensions', () => {
    expect(() =>
      validateTextureSizes({
        definition: createDefinition(),
        layerSourceCount: 1,
        textures: [createLease(100, 100)],
      }),
    ).not.toThrow()
    expect(() =>
      validateTextureSizes({
        definition: createDefinition({x: 40, y: 70}),
        layerSourceCount: 1,
        textures: [createLease(60, 30)],
      }),
    ).not.toThrow()
  })

  it('should reject mismatched full-scene dimensions and a texture without a layer', () => {
    expect(() =>
      validateTextureSizes({
        definition: createDefinition(),
        layerSourceCount: 1,
        textures: [createLease(99, 100)],
      }),
    ).toThrow('Invalid layer texture dimensions for layer.webp: 99x100')
    expect(() =>
      validateTextureSizes({
        definition: {...createDefinition(), layers: []},
        layerSourceCount: 1,
        textures: [createLease(100, 99, 'orphan.webp')],
      }),
    ).toThrow('Invalid layer texture dimensions for orphan.webp: 100x99')
  })

  it.each([
    {height: 20, label: 'zero width', position: {x: 0, y: 0}, width: 0},
    {height: 0, label: 'zero height', position: {x: 0, y: 0}, width: 20},
    {height: 20, label: 'negative x', position: {x: -1, y: 0}, width: 20},
    {height: 20, label: 'negative y', position: {x: 0, y: -1}, width: 20},
    {height: 20, label: 'right overflow', position: {x: 81, y: 0}, width: 20},
    {height: 20, label: 'bottom overflow', position: {x: 0, y: 81}, width: 20},
  ])('should reject positioned layer bounds with $label', ({height, position, width}) => {
    expect(() =>
      validateTextureSizes({
        definition: createDefinition(position),
        layerSourceCount: 1,
        textures: [createLease(width, height)],
      }),
    ).toThrow(
      `Invalid positioned layer bounds for layer.webp: ${width}x${height} at ${position.x},${position.y}`,
    )
  })

  it('should validate only the requested layer source prefix', () => {
    expect(() =>
      validateTextureSizes({
        definition: createDefinition(),
        layerSourceCount: 1,
        textures: [createLease(100, 100), createLease(1, 1, 'ignored-mask.webp')],
      }),
    ).not.toThrow()
  })
})
