/** @vitest-environment jsdom */
import {Application, Container, MeshSimple, RendererType, Texture} from 'pixi.js'
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest'
import {createEmptyDocument} from '../../create-empty-document'
import {createPlayerRenderer} from '../create-player-renderer'
import {renderMaskGroups} from '../render-mask-groups'
import * as initialization from '../initialize-runtime-parts'
import * as frames from '../apply-render-frame'
import type {RuntimePart} from '../types'
import type {PlayerRendererPreference} from '../../rendering-options'
import {loadTexture} from '../load-texture'

vi.mock('../render-mask-groups', () => ({renderMaskGroups: vi.fn()}))
vi.mock('../load-texture', () => ({loadTexture: vi.fn()}))

vi.mock('pixi.js', () => ({
  Application: vi.fn(),
  Container: vi.fn(),
  MeshSimple: vi.fn(),
  RendererType: {WEBGL: 1},
  Texture: {from: vi.fn()},
  UPDATE_PRIORITY: {LOW: 0},
}))

const application = {
  destroy: vi.fn(),
  init: vi.fn().mockResolvedValue(undefined),
  render: vi.fn(),
  renderer: {
    gl: {flush: vi.fn()},
    resetState: vi.fn(),
    resolution: 1,
    type: undefined as number | undefined,
  },
  resize: vi.fn(),
  screen: {height: 100, width: 100},
  stage: {addChild: vi.fn()},
  start: vi.fn(),
  stop: vi.fn(),
  ticker: {add: vi.fn(), remove: vi.fn()},
}
const root = {addChild: vi.fn(), position: {set: vi.fn()}, scale: {set: vi.fn()}}
const part = (id: string) => ({
  id,
  mesh: {indices: [0, 1, 2], uvs: [0, 0, 1, 0, 0, 1], vertices: [0, 0, 100, 0, 0, 100]},
  texture: {height: 100, src: `${id}.png`, width: 100},
})

beforeEach(() => {
  application.renderer.type = undefined
  vi.mocked(Application).mockImplementation(function mockApplication() {
    return application as unknown as Application
  })
  vi.mocked(Container).mockImplementation(function mockContainer() {
    return root as unknown as Container
  })
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('createPlayerRenderer', () => {
  test('should release a mask-only mesh that never entered the display tree', async () => {
    const mesh = {destroy: vi.fn(), parent: null}
    vi.spyOn(initialization, 'initializeRuntimeParts').mockImplementation(async ({partById}) => {
      partById.set('mask-only', {
        mesh,
        partId: 'mask-only',
        restVertices: [],
        vertices: new Float32Array(),
      } as unknown as RuntimePart)
    })
    const renderer = await createPlayerRenderer({
      canvas: document.createElement('canvas'),
      document: createEmptyDocument(),
    })
    renderer.destroy()
    renderer.destroy()
    expect(mesh.destroy).toHaveBeenCalledExactlyOnceWith({texture: true, textureSource: true})
  })

  test('should submit drawing before an external consumer and submit its completed commands', async () => {
    const events: string[] = []
    const instance = await createPlayerRenderer({
      canvas: document.createElement('canvas'),
      document: createEmptyDocument(),
      onAfterRender: () => events.push('consumer'),
    })
    application.renderer.type = RendererType.WEBGL
    application.render.mockImplementationOnce(() => events.push('draw'))
    application.renderer.gl.flush
      .mockImplementationOnce(() => events.push('submit'))
      .mockImplementationOnce(() => events.push('submit'))
    events.length = 0
    instance.redraw()
    expect(events).toEqual(['draw', 'submit', 'consumer', 'submit'])
    instance.destroy()
  })

  test('should redraw paused fitting changes and ignore unchanged or disposed fitting', async () => {
    const renderer = await createPlayerRenderer({
      canvas: document.createElement('canvas'),
      document: {...createEmptyDocument(), viewport: {height: 100, width: 200}},
    })
    renderer.setRunning(false)
    renderer.setFit('cover')
    expect(root.scale.set).toHaveBeenLastCalledWith(1)
    expect(root.position.set).toHaveBeenLastCalledWith(-50, 0)
    expect(application.render).toHaveBeenCalledOnce()
    renderer.setFit('cover')
    expect(application.render).toHaveBeenCalledOnce()
    renderer.setFit('contain')
    expect(root.scale.set).toHaveBeenLastCalledWith(0.5)
    expect(root.position.set).toHaveBeenLastCalledWith(0, 25)
    expect(application.render).toHaveBeenCalledTimes(2)
    renderer.destroy()
    renderer.setFit('cover')
    expect(application.render).toHaveBeenCalledTimes(2)
  })

  test('should only share graphics state while the optional external renderer is active', async () => {
    let active = false
    const onBeforeRender = vi.fn()
    const onAfterRender = vi.fn()
    const instance = await createPlayerRenderer({
      canvas: document.createElement('canvas'),
      document: createEmptyDocument(),
      externalRendering: () => active,
      onAfterRender,
      onBeforeRender,
    })
    instance.redraw()
    expect(onBeforeRender).not.toHaveBeenCalled()
    expect(onAfterRender).not.toHaveBeenCalled()
    expect(application.renderer.resetState).not.toHaveBeenCalled()
    active = true
    instance.redraw()
    expect(onBeforeRender).toHaveBeenCalledOnce()
    expect(onAfterRender).toHaveBeenCalledOnce()
    expect(application.renderer.resetState).toHaveBeenCalledTimes(2)
    active = false
    instance.redraw()
    expect(application.renderer.resetState).toHaveBeenCalledTimes(2)
    instance.destroy()
  })
  test.each<{renderer: PlayerRendererPreference; preference: string[]}>([
    {preference: ['webgl', 'webgpu'], renderer: 'auto'},
    {preference: ['webgl'], renderer: 'webgl'},
    {preference: ['webgpu'], renderer: 'webgpu'},
  ])(
    'should honor the requested backend without falling back from explicit $renderer',
    async ({renderer, preference}) => {
      const instance = await createPlayerRenderer({
        antialiasing: 'ssaa',
        canvas: document.createElement('canvas'),
        document: createEmptyDocument(),
        onAfterRender: vi.fn(),
        renderer,
      })
      expect(application.init).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({antialias: false, preference}),
      )
      instance.destroy()
    },
  )
  test('should release decoded textures and application resources when one texture fails', async () => {
    const failure = new Error('Texture decode failed')
    const texture = {destroy: vi.fn()}
    vi.mocked(loadTexture).mockImplementation(async (source) => {
      if (source === 'broken.png') {
        throw failure
      }
      return texture as unknown as Texture
    })
    const result = createPlayerRenderer({
      canvas: document.createElement('canvas'),
      document: {
        ...createEmptyDocument(),
        parts: [part('ready'), part('broken')],
        scene: undefined,
      },
    })
    await expect(result).rejects.toMatchObject({
      cause: failure,
      message: 'Puppet player resource initialization failed',
    })
    expect(texture.destroy).toHaveBeenCalledExactlyOnceWith(true)
    expect(application.destroy).toHaveBeenCalledOnce()
    expect(application.stage.addChild).not.toHaveBeenCalled()
    expect(MeshSimple).not.toHaveBeenCalled()
  })
  test('should retain the selected camera when resizing a paused renderer', async () => {
    const renderer = await createPlayerRenderer({
      canvas: document.createElement('canvas'),
      document: createEmptyDocument(),
    })
    renderer.setRunning(false)
    renderer.setViewCamera({x: 30, y: -20, zoom: 2})
    renderer.resize()
    expect(root.scale.set).toHaveBeenLastCalledWith(2)
    expect(root.position.set).toHaveBeenLastCalledWith(-60, 40)
    renderer.destroy()
  })
  test('should reject incompatible document reuse and close the renderer only once', async () => {
    const renderer = await createPlayerRenderer({
      canvas: document.createElement('canvas'),
      document: createEmptyDocument(),
    })
    renderer.setRunning(false)
    renderer.setRunning(false)
    renderer.setRunning(true)
    expect(application.stop).toHaveBeenCalledOnce()
    expect(application.start).toHaveBeenCalledOnce()
    expect(renderer.updateDocument({...createEmptyDocument(), parts: [part('new')]})).toBe(false)
    renderer.destroy()
    renderer.destroy()
    renderer.redraw()
    renderer.setRunning(false)
    expect(application.destroy).toHaveBeenCalledOnce()
    expect(application.render).not.toHaveBeenCalled()
  })
})

test('should render prepared masks once at presentation while keeping explicit redraw immediate', async () => {
  const destroy = vi.fn()
  const mask = {
    container: {destroy},
    filter: {destroy},
    meshes: [],
    sprite: {destroy},
    texture: {destroy},
  }
  vi.spyOn(initialization, 'initializeRuntimeParts').mockImplementation(async ({partById}) => {
    partById.set('masked', {
      mask,
      mesh: {alpha: 1, renderable: true, visible: true},
      partId: 'masked',
      restVertices: [],
      vertices: new Float32Array(0),
    } as unknown as RuntimePart)
  })
  vi.spyOn(frames, 'applyRenderFrame').mockReturnValue([])
  const renderer = await createPlayerRenderer({
    canvas: document.createElement('canvas'),
    document: createEmptyDocument(),
  })
  const frame = {
    frame: {layers: new Map(), plans: [], spatialPoses: new Map()},
    vertices: new Float32Array(0),
  }
  renderer.applyPreparedFrame(frame)
  renderer.applyPreparedFrame(frame)
  expect(renderMaskGroups).not.toHaveBeenCalled()
  renderer.redraw()
  expect(renderMaskGroups).toHaveBeenCalledOnce()
  expect(application.render).toHaveBeenCalledOnce()
  renderer.redraw()
  expect(renderMaskGroups).toHaveBeenCalledOnce()
  expect(application.render).toHaveBeenCalledTimes(2)
  renderer.destroy()
})

test('should retain submitted meshes until the deferred document has a computed frame', async () => {
  const original = part('part')
  const source = {...createEmptyDocument(), parts: [original]}
  const replacement = {
    ...source,
    parts: [{...original, mesh: {...original.mesh, vertices: [5, 5, 10, 5, 5, 10]}}],
  }
  const coordinates = new Float32Array(original.mesh.vertices)
  vi.spyOn(initialization, 'initializeRuntimeParts').mockImplementation(async ({partById}) => {
    partById.set('part', {
      mesh: {geometry: {}},
      restVertices: original.mesh.vertices,
      vertices: coordinates,
    } as unknown as RuntimePart)
  })
  const apply = vi.spyOn(frames, 'applyRenderFrame').mockReturnValue([])
  const renderer = await createPlayerRenderer({
    canvas: document.createElement('canvas'),
    document: source,
  })
  expect(renderer.updateDocument(replacement, true)).toBe(true)
  renderer.resize()
  renderer.redraw()
  expect(apply).not.toHaveBeenCalled()
  expect(renderer.getPartVertices('part')).toBe(coordinates)
  renderer.applyPreparedFrame({
    frame: {layers: new Map(), plans: [], spatialPoses: new Map()},
    vertices: new Float32Array(0),
  })
  expect(apply).toHaveBeenLastCalledWith(expect.objectContaining({document: replacement}))
  renderer.destroy()
})

test('should restore paused masks after context restoration and release the listener on destruction', async () => {
  const destroy = vi.fn()
  vi.spyOn(initialization, 'initializeRuntimeParts').mockImplementation(async ({partById}) => {
    partById.set('masked', {
      mask: {
        container: {destroy},
        filter: {destroy},
        meshes: [],
        sprite: {destroy},
        texture: {destroy},
      },
      mesh: {alpha: 1, renderable: true, visible: true},
      partId: 'masked',
      restVertices: [],
      vertices: new Float32Array(0),
    } as unknown as RuntimePart)
  })
  vi.spyOn(frames, 'applyRenderFrame').mockReturnValue([])
  const canvas = document.createElement('canvas')
  const renderer = await createPlayerRenderer({canvas, document: createEmptyDocument()})
  renderer.setRunning(false)
  renderer.applyPreparedFrame({
    frame: {layers: new Map(), plans: [], spatialPoses: new Map()},
    vertices: new Float32Array(0),
  })
  renderer.redraw()
  expect(renderMaskGroups).toHaveBeenCalledOnce()
  canvas.dispatchEvent(new Event('webglcontextrestored'))
  expect(renderMaskGroups).toHaveBeenCalledTimes(2)
  expect(application.render).toHaveBeenCalledTimes(2)
  renderer.destroy()
  canvas.dispatchEvent(new Event('webglcontextrestored'))
  expect(renderMaskGroups).toHaveBeenCalledTimes(2)
  expect(application.render).toHaveBeenCalledTimes(2)
})
