/** @vitest-environment jsdom */
import {
  Container,
  type GenerateTextureOptions,
  type Renderer,
  Sprite,
  Texture,
  TextureSource,
} from 'pixi.js'
import {expect, it, vi} from 'vitest'
import {PhotoEdges} from '../edges'

vi.mock('pixi.js', async (original) => ({
  ...(await original<typeof import('pixi.js')>()),
  BlurFilter: class {
    destroy() {}
  },
}))

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
