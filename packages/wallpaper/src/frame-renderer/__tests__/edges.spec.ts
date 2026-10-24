/** @vitest-environment jsdom */
import {
  BlurFilter,
  Container,
  type GenerateTextureOptions,
  type Renderer,
  Sprite,
  Texture,
  TextureSource,
} from 'pixi.js'
import {beforeEach, expect, it, vi} from 'vitest'
import {PhotoEdges} from '../edges'

vi.mock('pixi.js', async (original) => ({
  ...(await original<typeof import('pixi.js')>()),
  BlurFilter: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(BlurFilter).mockImplementation(function createFilter() {
    return {destroy: vi.fn()} as unknown as BlurFilter
  })
})

it('should extend original edges before blurring, cache the result and rebuild only for changed layout', () => {
  const texture = new Texture({source: new TextureSource({height: 200, width: 400})})
  const generated: Texture[] = []
  const passes: {
    filtered: boolean
    regions: {x: number; y: number; width: number; height: number}[]
  }[] = []
  const generateTexture = vi.fn((options: GenerateTextureOptions) => {
    const target = options.target
    const children = target instanceof Sprite ? [target] : (target as Container).children
    passes.push({
      filtered: Boolean(target.filters?.length),
      regions: children.map((child) => ({
        height: child.height,
        width: child.width,
        x: child.x,
        y: child.y,
      })),
    })
    const result = new Texture({source: new TextureSource({height: 128, width: 256})})
    generated.push(result)
    return result
  })
  const edges = new PhotoEdges({renderer: {generateTexture} as unknown as Renderer, texture})
  edges.resize({height: 600, photoHeight: 150, photoWidth: 300, width: 300})
  expect(passes[0]).toEqual({
    filtered: false,
    regions: [
      {height: 225, width: 300, x: 0, y: 0},
      {height: 225, width: 300, x: 0, y: 375},
      {height: 150, width: 300, x: 0, y: 225},
    ],
  })
  expect(passes[1]?.filtered).toBe(true)
  expect(generateTexture).toHaveBeenCalledTimes(2)
  expect(generated[0]?.destroyed).toBe(true)
  edges.resize({height: 600, photoHeight: 150, photoWidth: 300, width: 300})
  expect(generateTexture).toHaveBeenCalledTimes(2)
  edges.resize({height: 300, photoHeight: 300, photoWidth: 150, width: 600})
  expect(passes[2]).toEqual({
    filtered: false,
    regions: [
      {height: 300, width: 225, x: 0, y: 0},
      {height: 300, width: 225, x: 375, y: 0},
      {height: 300, width: 150, x: 225, y: 0},
    ],
  })
  expect(generated[1]?.destroyed).toBe(true)
  edges.resize({height: 300, photoHeight: 300, photoWidth: 300, width: 300})
  expect(edges.view.children).toHaveLength(0)
  edges.destroy()
  expect(generated.every((item) => item.destroyed)).toBe(true)
  expect(texture.source.destroyed).toBe(false)
  texture.destroy(true)
})

it.each(['horizontal', 'vertical'] as const)(
  'should extend each outer margin from its adjacent photo for %s pairs',
  (direction) => {
    const horizontal = direction === 'horizontal'
    const size = horizontal ? {height: 300, width: 100} : {height: 100, width: 300}
    const first = new Texture({source: new TextureSource(size)})
    const second = new Texture({source: new TextureSource(size)})
    const replacement = new Texture({source: new TextureSource(size)})
    const sources: TextureSource[][] = []
    const frames: {x: number; y: number}[][] = []
    const generateTexture = vi.fn(({target}: GenerateTextureOptions) => {
      if (!(target instanceof Sprite)) {
        const sprites = (target as Container).children.filter((child) => child instanceof Sprite)
        sources.push(sprites.map((sprite) => sprite.texture.source))
        frames.push(
          sprites.map((sprite) => ({x: sprite.texture.frame.x, y: sprite.texture.frame.y})),
        )
      }
      return new Texture({source: new TextureSource({height: 128, width: 128})})
    })
    const edges = new PhotoEdges({
      renderer: {generateTexture} as unknown as Renderer,
      texture: first,
    })
    const layout = {
      height: 300,
      photoHeight: horizontal ? 300 : 200,
      photoWidth: horizontal ? 200 : 300,
      width: 300,
    }
    edges.resize({...layout, companion: {direction, texture: second}})
    expect(sources[0]).toEqual([first.source, second.source, first.source, second.source])
    expect(frames[0]?.[1]).toEqual(horizontal ? {x: 92, y: 0} : {x: 0, y: 92})
    edges.resize({...layout, companion: {direction, texture: second}})
    expect(generateTexture).toHaveBeenCalledTimes(2)
    edges.resize({...layout, companion: {direction, texture: replacement}})
    expect(generateTexture).toHaveBeenCalledTimes(4)
    expect(sources[1]?.[1]).toBe(replacement.source)
    edges.destroy()
    for (const texture of [first, second, replacement]) {
      expect(texture.source.destroyed).toBe(false)
      texture.destroy(true)
    }
  },
)

it('should keep crop resources alive through both rendering passes before releasing them', () => {
  const texture = new Texture({source: new TextureSource({height: 200, width: 400})})
  let composite: Container | undefined
  let crops: Texture[] = []
  const generated: Texture[] = []
  const generateTexture = vi.fn(({target}: GenerateTextureOptions) => {
    if (target instanceof Sprite) {
      expect(composite?.destroyed).toBe(false)
      expect(crops.every((crop) => !crop.destroyed)).toBe(true)
    } else {
      composite = target
      crops = target.children.map((child) => (child as Sprite).texture)
    }
    const result = new Texture({source: new TextureSource({height: 128, width: 256})})
    generated.push(result)
    return result
  })
  const edges = new PhotoEdges({renderer: {generateTexture} as unknown as Renderer, texture})

  edges.resize({height: 600, photoHeight: 150, photoWidth: 300, width: 300})
  expect(generateTexture).toHaveBeenCalledTimes(2)
  expect(composite?.destroyed).toBe(true)
  expect(crops.every((crop) => crop.destroyed)).toBe(true)
  expect(generated[0]?.destroyed).toBe(true)
  expect(texture.source.destroyed).toBe(false)
  edges.destroy()
  expect(generated[1]?.destroyed).toBe(true)
  texture.destroy(true)
})

it.each([1, 2])('should release temporary resources when render pass %s fails', (pass) => {
  const texture = new Texture({source: new TextureSource({height: 200, width: 400})})
  const failure = new Error('render failed')
  let composite: Container | undefined
  let crops: Texture[] = []
  let stretched: Texture | undefined
  let calls = 0
  const generateTexture = vi.fn(({target}: GenerateTextureOptions) => {
    calls += 1
    if (!(target instanceof Sprite)) {
      composite = target
      crops = target.children.map((child) => (child as Sprite).texture)
    }
    if (calls === pass) {
      throw failure
    }
    stretched = new Texture({source: new TextureSource({height: 128, width: 256})})
    return stretched
  })
  const edges = new PhotoEdges({renderer: {generateTexture} as unknown as Renderer, texture})

  expect(() => edges.resize({height: 600, photoHeight: 150, photoWidth: 300, width: 300})).toThrow(
    failure,
  )
  expect(composite?.destroyed).toBe(true)
  expect(crops.every((crop) => crop.destroyed)).toBe(true)
  expect(stretched?.destroyed ?? true).toBe(true)
  expect(texture.destroyed).toBe(false)
  expect(texture.source.destroyed).toBe(false)
  expect(texture.source.listenerCount('resize')).toBe(1)
  expect(edges.view.children).toHaveLength(0)
  edges.destroy()
  texture.destroy(true)
})
