/** @vitest-environment jsdom */
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {TarotDepthRenderer} from '../renderer'

const mocks = vi.hoisted(() => ({
  addChild: vi.fn(),
  compositionDestroy: vi.fn(),
  decode: vi.fn<() => Promise<void>>(),
  destroy: vi.fn(),
  filterDestroy: vi.fn(),
  init: vi.fn<() => Promise<void>>(),
  reflectionDestroy: vi.fn(),
  reflectionOrientation: vi.fn(),
  render: vi.fn(),
  renderTextureDestroy: vi.fn(),
  resize: vi.fn(),
  setCorners: vi.fn(),
  setOffset: vi.fn(),
  textureDestroy: vi.fn(),
}))

vi.mock('pixi.js', () => ({
  Application: class {
    screen = {height: 1, width: 1}
    stage = {addChild: mocks.addChild}
    renderer = {render: mocks.render, resize: mocks.resize}
    init = mocks.init
    render = mocks.render
    destroy = mocks.destroy
  },
  Container: class {
    addChild = mocks.addChild
    destroy = mocks.compositionDestroy
  },
  PerspectiveMesh: class {
    setCorners = mocks.setCorners
  },
  RenderTexture: {create: () => ({destroy: mocks.renderTextureDestroy})},
  Sprite: class {},
  Text: class {
    width = 200
    anchor = {set: vi.fn()}
    position = {set: vi.fn()}
    scale = {set: vi.fn()}
  },
  Texture: {from: () => ({destroy: mocks.textureDestroy})},
}))
vi.mock('../depth-filter', () => ({
  TarotDepthFilter: class {
    setOffset = mocks.setOffset
    destroy = mocks.filterDestroy
  },
}))
vi.mock('../reflection-filter', () => ({
  TarotReflectionFilter: class {
    setOrientation = mocks.reflectionOrientation
    destroy = mocks.reflectionDestroy
  },
}))

const options = () => ({
  canvas: document.createElement('canvas'),
  depth: '/depth.webp',
  frame: '/frame.png',
  image: '/card.png',
  marker: '0',
  name: '광대',
})

beforeEach(() => {
  vi.clearAllMocks()
  mocks.init.mockResolvedValue()
  mocks.decode.mockResolvedValue()
  vi.stubGlobal(
    'Image',
    class {
      decode = mocks.decode
    },
  )
})

afterEach(() => vi.unstubAllGlobals())

describe('TarotDepthRenderer', () => {
  it('should render a tilted reversed card and release its owned resources exactly once', async () => {
    const renderer = new TarotDepthRenderer()
    expect(await renderer.initialize(options())).toBe(true)
    const [illustration, frame] = mocks.addChild.mock.calls[0]!
    const [face, marker, name] = mocks.addChild.mock.calls[1]!
    expect(illustration.filters).toHaveLength(1)
    expect(frame.filters).toBeUndefined()
    expect(face.filters).toHaveLength(1)
    expect(marker).toBeDefined()
    expect(name).toBeDefined()
    expect(marker.filters).toBeUndefined()
    expect(name.filters).toBeUndefined()
    renderer.render({height: 600, reversed: true, width: 400, x: 0.5, y: 0.25})
    expect(mocks.resize).toHaveBeenCalledWith(400, 600)
    expect(mocks.setOffset).toHaveBeenCalledWith(0.5, 0.25)
    expect(mocks.reflectionOrientation).toHaveBeenCalledWith({reversed: true, x: 0.5, y: 0.25})
    expect(mocks.setCorners).toHaveBeenCalledOnce()
    renderer.destroy()
    renderer.destroy()
    expect(mocks.destroy).toHaveBeenCalledOnce()
    expect(mocks.textureDestroy).toHaveBeenCalledTimes(3)
    expect(mocks.renderTextureDestroy).toHaveBeenCalledOnce()
    expect(mocks.filterDestroy).toHaveBeenCalledOnce()
    expect(mocks.reflectionDestroy).toHaveBeenCalledOnce()
    expect(mocks.compositionDestroy).toHaveBeenCalledOnce()
  })

  it('should keep upright reflection aligned with tilt and return its light to neutral', async () => {
    const renderer = new TarotDepthRenderer()
    await renderer.initialize(options())
    renderer.render({height: 600, reversed: false, width: 400, x: -1, y: 0.5})
    expect(mocks.reflectionOrientation).toHaveBeenLastCalledWith({reversed: false, x: -1, y: 0.5})
    renderer.render({height: 600, reversed: false, width: 400, x: 0, y: 0})
    expect(mocks.reflectionOrientation).toHaveBeenLastCalledWith({reversed: false, x: 0, y: 0})
    renderer.destroy()
  })

  it('should dispose a late initialization after the viewer is already closed', async () => {
    const {promise, resolve} = Promise.withResolvers<void>()
    mocks.init.mockReturnValue(promise)
    const renderer = new TarotDepthRenderer()
    const initialization = renderer.initialize(options())
    renderer.destroy()
    resolve()
    expect(await initialization).toBe(false)
    expect(mocks.destroy).toHaveBeenCalledOnce()
    expect(mocks.decode).not.toHaveBeenCalled()
  })

  it('should release the renderer and loaded image when the depth texture fails', async () => {
    const failure = new Error('Depth image failed')
    mocks.decode.mockResolvedValueOnce().mockRejectedValueOnce(failure)
    const renderer = new TarotDepthRenderer()
    await expect(renderer.initialize(options())).rejects.toThrow(failure)
    expect(mocks.destroy).toHaveBeenCalledOnce()
    expect(mocks.textureDestroy).toHaveBeenCalledTimes(2)
    renderer.destroy()
    expect(mocks.destroy).toHaveBeenCalledOnce()
  })
})
