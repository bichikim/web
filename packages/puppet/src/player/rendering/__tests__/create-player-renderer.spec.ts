/** @vitest-environment jsdom */
import {Application, Container, MeshSimple, Texture} from 'pixi.js'
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest'
import {createEmptyDocument} from '../../create-empty-document'
import {createPlayerRenderer} from '../create-player-renderer'

vi.mock('pixi.js', () => ({
  Application: vi.fn(),
  Container: vi.fn(),
  MeshSimple: vi.fn(),
  Texture: {from: vi.fn()},
}))

const application = {
  destroy: vi.fn(),
  init: vi.fn().mockResolvedValue(undefined),
  render: vi.fn(),
  resize: vi.fn(),
  screen: {height: 100, width: 100},
  stage: {addChild: vi.fn()},
  start: vi.fn(),
  stop: vi.fn(),
  ticker: {add: vi.fn()},
}
const root = {addChild: vi.fn(), position: {set: vi.fn()}, scale: {set: vi.fn()}}
const part = (id: string) => ({
  id,
  mesh: {indices: [0, 1, 2], uvs: [0, 0, 1, 0, 0, 1], vertices: [0, 0, 100, 0, 0, 100]},
  texture: {height: 100, src: `${id}.png`, width: 100},
})

beforeEach(() => {
  vi.mocked(Application).mockImplementation(function mockApplication() {
    return application as unknown as Application
  })
  vi.mocked(Container).mockImplementation(function mockContainer() {
    return root as unknown as Container
  })
})
afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('createPlayerRenderer', () => {
  test('should release decoded textures and application resources when one texture fails', async () => {
    const failure = new Error('Texture decode failed')
    const texture = {destroy: vi.fn()}
    vi.mocked(Texture.from).mockReturnValue(texture as unknown as Texture)
    vi.stubGlobal(
      'Image',
      class {
        src = ''
        decode() {
          return this.src === 'broken.png' ? Promise.reject(failure) : Promise.resolve()
        }
      },
    )
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
