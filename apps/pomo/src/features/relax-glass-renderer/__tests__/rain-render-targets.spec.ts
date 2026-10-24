import {RenderTexture} from 'pixi.js'
import {afterEach, expect, it, vi} from 'vitest'

import {RainRenderTargets} from '..'

afterEach(() => {
  vi.restoreAllMocks()
})

it('should retain five distinct dynamic textures while resizing and release them once', () => {
  const targets = RainRenderTargets.create()
  const textures = [
    targets.rain,
    targets.droplet,
    targets.dropletHistory,
    targets.mist,
    targets.mistHistory,
  ]

  expect(new Set(textures).size).toBe(5)
  expect(textures.every((texture) => texture.dynamic)).toBe(true)
  const destroyCalls = textures.map((texture) => vi.spyOn(texture, 'destroy'))

  targets.resize(640, 360)
  for (const texture of textures) {
    expect(texture.width).toBe(640)
    expect(texture.height).toBe(360)
    expect(texture.destroyed).toBe(false)
  }

  targets.destroy()
  targets.destroy()
  for (const texture of textures) {
    expect(texture.destroyed).toBe(true)
  }
  for (const destroy of destroyCalls) {
    expect(destroy).toHaveBeenCalledOnce()
  }
})

it('should release textures already created when a later allocation fails', () => {
  const create = RenderTexture.create.bind(RenderTexture)
  const textures: RenderTexture[] = []
  const failure = new Error('texture allocation failed')
  vi.spyOn(RenderTexture, 'create').mockImplementation((options) => {
    if (textures.length === 2) {
      throw failure
    }
    const texture = create(options)
    textures.push(texture)
    return texture
  })

  expect(() => RainRenderTargets.create()).toThrow(failure)
  expect(textures).toHaveLength(2)
  expect(textures.every((texture) => texture.destroyed)).toBe(true)
})
