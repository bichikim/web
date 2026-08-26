import {expect, it, vi} from 'vitest'

const pixiMocks = vi.hoisted(() => {
  class UniformGroup {
    readonly uniforms: Record<string, unknown>

    constructor(uniforms: Record<string, {value: unknown}>) {
      this.uniforms = Object.fromEntries(
        Object.entries(uniforms).map(([name, definition]) => [name, definition.value]),
      )
    }
  }

  class Filter {
    readonly resources: Record<string, unknown>

    constructor(readonly options: {resources: Record<string, unknown>}) {
      this.resources = options.resources
    }
  }

  return {Filter, from: vi.fn((program) => program), UniformGroup}
})

vi.mock('pixi.js', () => ({
  Filter: pixiMocks.Filter,
  GlProgram: {from: pixiMocks.from},
  UniformGroup: pixiMocks.UniformGroup,
}))

import type {Texture} from 'pixi.js'

import {DepthParallaxFilter} from '../depth-parallax-filter'

const createTexture = (name: string) =>
  ({source: {name, style: {name: `${name}-style`}}}) as unknown as Texture

it('should update pointer and depth-transition uniforms and resources', () => {
  const initial = createTexture('initial')
  const next = createTexture('next')
  const filter = new DepthParallaxFilter(initial)
  const uniforms = (
    filter.resources.parallaxUniforms as InstanceType<typeof pixiMocks.UniformGroup>
  ).uniforms as {
    uDepthMix: number
    uPointerPixels: Float32Array
  }

  expect(pixiMocks.from).toHaveBeenCalledWith(
    expect.objectContaining({name: 'focus-room-depth-parallax'}),
  )
  filter.setPointerOffset(12, -8)
  expect([...uniforms.uPointerPixels]).toEqual([12, -8])
  filter.setDepthTransition(next)
  expect(filter.resources.uNextDepthTexture).toBe(next.source)
  expect(filter.resources.uNextDepthSampler).toBe(next.source.style)
  filter.setDepthMix(0.4)
  expect(uniforms.uDepthMix).toBe(0.4)

  filter.finishDepthTransition()
  expect(filter.resources.uDepthTexture).toBe(next.source)
  expect(filter.resources.uDepthSampler).toBe(next.source.style)
  expect(uniforms.uDepthMix).toBe(0)

  filter.setDepthTransition(initial)
  filter.setDepthMix(0.8)
  filter.cancelDepthTransition()
  expect(filter.resources.uNextDepthTexture).toBe(next.source)
  expect(filter.resources.uNextDepthSampler).toBe(next.source.style)
  expect(uniforms.uDepthMix).toBe(0)
})
