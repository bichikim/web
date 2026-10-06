/** @vitest-environment jsdom */
import {Container, Rectangle, Sprite, Texture, TextureSource} from 'pixi.js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {createTextureRegions, type TextureRegion} from '..'

vi.mock('pixi.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('pixi.js')>()),
  Container: vi.fn(),
  Sprite: vi.fn(),
  Texture: vi.fn(),
}))

const actual = await vi.importActual<typeof import('pixi.js')>('pixi.js')
const crops: Texture[] = []
const sprites: Sprite[] = []
const views: Container[] = []
const borrowed: Texture[] = []

const createRegion = (): TextureRegion => {
  const texture = new actual.Texture({source: new TextureSource({height: 64, width: 128})})
  borrowed.push(texture)
  return {
    area: new Rectangle(3, 5, 100, 20),
    source: new Rectangle(8, 4, 20, 10),
    texture,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  crops.length = 0
  sprites.length = 0
  views.length = 0
  borrowed.length = 0
  vi.mocked(Container).mockImplementation(function createView(options) {
    const view = new actual.Container(options)
    views.push(view)
    return view
  })
  vi.mocked(Texture).mockImplementation(function createCrop(options) {
    const crop = new actual.Texture(options)
    crops.push(crop)
    return crop
  })
  vi.mocked(Sprite).mockImplementation(function createSprite(options) {
    const sprite = new actual.Sprite(options)
    sprites.push(sprite)
    return sprite
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  for (const texture of borrowed) {
    texture.destroy(true)
  }
})

describe('createTextureRegions', () => {
  it('should crop, scale and place regions in input order while borrowing shared sources', () => {
    const first = createRegion()
    const second = {...first, area: new Rectangle(10, 20, 50, 30)}
    const source = first.texture.source
    const subscriptions = source.listenerCount('resize')
    const layer = createTextureRegions({regions: [first, second]})

    expect(layer.view.children).toEqual(sprites)
    expect(sprites.map((sprite) => [sprite.x, sprite.y, sprite.width, sprite.height])).toEqual([
      [3, 5, 100, 20],
      [10, 20, 50, 30],
    ])
    expect(crops.map((crop) => crop.source)).toEqual([source, source])
    expect(crops[0]).not.toBe(first.texture)
    expect(crops[0]?.frame).toEqual(first.source)
    expect(crops[0]?.frame).not.toBe(first.source)
    expect(source.listenerCount('resize')).toBe(subscriptions + 2)
    layer.dispose()
    expect(layer.view.destroyed).toBe(true)
    expect(sprites.every((sprite) => sprite.destroyed)).toBe(true)
    expect(crops.every((crop) => crop.destroyed)).toBe(true)
    expect(first.texture.destroyed).toBe(false)
    expect(source.destroyed).toBe(false)
    expect(source.listenerCount('resize')).toBe(subscriptions)
    expect(first.area).toEqual(new Rectangle(3, 5, 100, 20))
    expect(first.source).toEqual(new Rectangle(8, 4, 20, 10))
  })

  it('should interpret source frames absolutely even when the borrowed texture is cropped', () => {
    const region = createRegion()
    region.texture.frame.copyFrom(new Rectangle(40, 20, 10, 10))
    const layer = createTextureRegions({regions: [region]})

    expect(crops[0]?.frame).toEqual(new Rectangle(8, 4, 20, 10))
    expect(sprites[0]?.scale.x).toBe(5)
    expect(sprites[0]?.scale.y).toBe(2)
    layer.dispose()
    expect(region.texture.frame).toEqual(new Rectangle(40, 20, 10, 10))
  })

  it.each([0, -1, NaN])(
    'should omit regions with nonpositive or NaN area dimensions: %s',
    (size) => {
      const region = createRegion()
      const layer = createTextureRegions({
        regions: [
          {...region, area: new Rectangle(0, 0, size, 10)},
          {...region, area: new Rectangle(0, 0, 10, size)},
        ],
      })

      expect(layer.view.children).toHaveLength(0)
      expect(crops).toHaveLength(0)
      layer.dispose()
      expect(region.texture.destroyed).toBe(false)
    },
  )

  it('should produce a disposable empty layer', () => {
    const layer = createTextureRegions({regions: []})
    layer.dispose()
    layer.dispose()
    expect(layer.view.destroyed).toBe(true)
    expect(crops).toHaveLength(0)
  })

  it('should destroy view children before crops and attempt disposal only once', () => {
    const layer = createTextureRegions({regions: [createRegion(), createRegion()]})
    const order: string[] = []
    layer.view.on('destroyed', () => order.push('view'))
    sprites.forEach((sprite, index) => sprite.on('destroyed', () => order.push(`sprite${index}`)))
    crops.forEach((crop, index) => crop.on('destroy', () => order.push(`crop${index}`)))
    layer.dispose()
    layer.dispose()
    expect(order[0]).toBe('view')
    expect(order.slice(1, 3)).toEqual(expect.arrayContaining(['sprite0', 'sprite1']))
    expect(order.slice(3)).toEqual(['crop0', 'crop1'])
  })

  it('should roll back acquired regions if a later texture constructor fails', () => {
    const regions = [createRegion(), createRegion()]
    const failure = new Error('crop creation failed')
    vi.mocked(Texture)
      .mockImplementationOnce(function createCrop(options) {
        const crop = new actual.Texture(options)
        crops.push(crop)
        return crop
      })
      .mockImplementationOnce(function failCrop() {
        throw failure
      })

    expect(() => createTextureRegions({regions})).toThrow(failure)
    expect(views[0]?.destroyed).toBe(true)
    expect(sprites[0]?.destroyed).toBe(true)
    expect(crops[0]?.destroyed).toBe(true)
    expect(regions.every((region) => !region.texture.source.destroyed)).toBe(true)
  })

  it('should release a sprite and crop when placement fails before adoption', () => {
    const region = createRegion()
    const failure = new Error('placement failed')
    Object.defineProperty(region.area, 'x', {
      get: () => {
        throw failure
      },
    })

    expect(() => createTextureRegions({regions: [region]})).toThrow(failure)
    expect(views[0]?.destroyed).toBe(true)
    expect(sprites[0]?.destroyed).toBe(true)
    expect(crops[0]?.destroyed).toBe(true)
    expect(region.texture.source.listenerCount('resize')).toBe(1)
  })

  it.each([0, 1])(
    'should avoid source subscriptions when frame access fails at region %s',
    (index) => {
      const regions = [createRegion(), createRegion()]
      const failure = new Error('frame access failed')
      const region = regions[index]!
      Object.defineProperty(region.source, 'x', {
        get: () => {
          throw failure
        },
      })

      expect(() => createTextureRegions({regions})).toThrow(failure)
      expect(views[0]?.destroyed).toBe(true)
      expect(crops).toHaveLength(index)
      expect(crops.every((crop) => crop.destroyed)).toBe(true)
      expect(sprites.every((sprite) => sprite.destroyed)).toBe(true)
      expect(regions.every(({texture}) => texture.source.listenerCount('resize') === 1)).toBe(true)
      expect(regions.every(({texture}) => !texture.destroyed && !texture.source.destroyed)).toBe(
        true,
      )
    },
  )

  it('should attempt every acquired release and preserve the first cleanup error', () => {
    const layer = createTextureRegions({regions: [createRegion(), createRegion()]})
    const failure = new Error('view destruction observer failed')
    const later = new Error('crop destruction observer failed')
    layer.view.on('destroyed', () => {
      throw failure
    })
    crops[0]?.on('destroy', () => {
      throw later
    })

    expect(() => layer.dispose()).toThrow(failure)
    expect(sprites.every((sprite) => sprite.destroyed)).toBe(true)
    expect(crops.every((crop) => crop.destroyed)).toBe(true)
    expect(borrowed.every((texture) => texture.source.listenerCount('resize') === 1)).toBe(true)
    expect(() => layer.dispose()).not.toThrow()
  })

  it('should preserve an undefined cleanup failure rather than treating it as success', () => {
    const layer = createTextureRegions({regions: [createRegion()]})
    layer.view.on('destroyed', () => {
      // oxlint-disable-next-line eslint/no-throw-literal -- Exercise the native observer's arbitrary thrown-value contract.
      throw undefined
    })
    const sentinel = Symbol('not thrown')
    let failure: unknown = sentinel
    try {
      layer.dispose()
    } catch (error: unknown) {
      failure = error
    }
    expect(failure).toBeUndefined()
    expect(crops[0]?.destroyed).toBe(true)
    expect(sprites[0]?.destroyed).toBe(true)
  })
})
