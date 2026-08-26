import {expect, it, vi} from 'vitest'

const pixiMocks = vi.hoisted(() => {
  const instances: Array<{destroy: ReturnType<typeof vi.fn>}> = []
  class UniformGroup {
    readonly uniforms: Record<string, unknown>

    constructor(uniforms: Record<string, {value: unknown}>) {
      this.uniforms = Object.fromEntries(
        Object.entries(uniforms).map(([name, definition]) => [name, definition.value]),
      )
    }
  }

  class Filter {
    readonly destroy = vi.fn()
    readonly resources: Record<string, unknown>

    constructor(readonly options: {resources: Record<string, unknown>}) {
      this.resources = options.resources
      instances.push(this)
    }
  }

  return {Filter, from: vi.fn((program) => program), instances, UniformGroup}
})

vi.mock('pixi.js', () => ({
  Filter: pixiMocks.Filter,
  GlProgram: {from: pixiMocks.from},
  UniformGroup: pixiMocks.UniformGroup,
}))

import type {Texture} from 'pixi.js'

import {LayerMaskFilter} from '../layer-mask-filter'
import type {PixiScenePushEffect} from '../layer-scene-definition'
import {MaskedPixelPushFilter} from '../masked-pixel-push-filter'
import {PixelPushFilter} from '../pixel-push-filter'
import {createPushFilter, createPushFilters} from '../push-filter-factory'

const createTexture = (width: number, height: number) =>
  ({height, source: {style: {}}, width}) as unknown as Texture

const maskedEffect = {
  distance: {x: 2, y: 3},
  kind: 'masked-pixel-push',
  maskSource: 'mask.webp',
} as const

const pixelEffect = {
  distance: {x: 4, y: 5},
  featherPixels: 6,
  kind: 'pixel-push',
  region: {height: 8, width: 7, x: 9, y: 10},
} as const

const getUniforms = (filter: {resources: Record<string, unknown>}, key: string) =>
  (filter.resources[key] as InstanceType<typeof pixiMocks.UniformGroup>).uniforms

it('should create and update both pixel-push filter variants', () => {
  const layerTexture = createTexture(100, 80)
  const maskTexture = createTexture(100, 80)
  const layerMaskFilter = new LayerMaskFilter({maskTexture})
  const pixelFilter = createPushFilter(pixelEffect, new Map(), layerTexture)
  const maskedFilter = createPushFilter(
    maskedEffect,
    new Map([['mask.webp', maskTexture]]),
    layerTexture,
  )

  expect(layerMaskFilter).toBeInstanceOf(LayerMaskFilter)
  expect(pixelFilter).toBeInstanceOf(PixelPushFilter)
  expect(maskedFilter).toBeInstanceOf(MaskedPixelPushFilter)
  pixelFilter.setProgress(0.25)
  maskedFilter.setProgress(0.75)
  expect(getUniforms(pixelFilter, 'pixelPushUniforms').uProgress).toBe(0.25)
  expect(getUniforms(maskedFilter, 'maskedPixelPushUniforms').uProgress).toBe(0.75)
  expect(maskedFilter.resources.uMaskTexture).toBe(maskTexture.source)
  expect(layerMaskFilter.resources.uMaskTexture).toBe(maskTexture.source)
})

it('should reject missing, mismatched, and unsupported masks or effects', () => {
  const layerTexture = createTexture(100, 80)
  expect(() => createPushFilter(maskedEffect, new Map(), layerTexture)).toThrow(
    'Missing pixel-push mask texture: mask.webp',
  )
  expect(() =>
    createPushFilter(maskedEffect, new Map([['mask.webp', createTexture(99, 80)]]), layerTexture),
  ).toThrow('Pixel-push mask dimensions must match the layer: mask.webp')
  expect(() =>
    createPushFilter(
      {kind: 'future-effect'} as unknown as PixiScenePushEffect,
      new Map(),
      layerTexture,
    ),
  ).toThrow('Unsupported pixel-push effect: [object Object]')
})

it('should destroy filters already created when a later effect fails', () => {
  const layerTexture = createTexture(100, 80)
  const instanceCount = pixiMocks.instances.length
  expect(() => createPushFilters([pixelEffect, maskedEffect], new Map(), layerTexture)).toThrow()
  expect(pixiMocks.instances[instanceCount].destroy).toHaveBeenCalledOnce()
})

it('should return every successfully created filter', () => {
  const layerTexture = createTexture(100, 80)
  expect(createPushFilters([pixelEffect], new Map(), layerTexture)).toHaveLength(1)
})
