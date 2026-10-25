/** @vitest-environment jsdom */
import {afterEach, expect, it, vi} from 'vitest'
import {Application} from 'pixi.js'

import {GlassPixiRuntime} from '../pixi-runtime'

vi.mock('pixi.js', () => ({Application: vi.fn(), Texture: {from: vi.fn()}}))

const mockApplication = (renderer: unknown = undefined) => {
  const application = {
    destroy: vi.fn(),
    init: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
    renderer,
  }
  vi.mocked(Application).mockImplementation(function mockConstructor() {
    return application as unknown as Application
  })
  return application
}

afterEach(() => {
  vi.resetAllMocks()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it('should release resize and motion listeners when the canvas runtime is destroyed', () => {
  mockApplication()
  const observe = vi.fn()
  const disconnect = vi.fn()
  const addEventListener = vi.fn()
  const removeEventListener = vi.fn()
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe = observe
      disconnect = disconnect
    },
  )
  vi.stubGlobal('matchMedia', () => ({
    addEventListener,
    matches: false,
    removeEventListener,
  }))
  const runtime = new GlassPixiRuntime()
  const canvas = document.createElement('canvas')
  const onResize = vi.fn()
  const onMotion = vi.fn()
  const documentAdd = vi.spyOn(document, 'addEventListener')
  const documentRemove = vi.spyOn(document, 'removeEventListener')

  runtime.attachEnvironment(canvas, onResize, onMotion)
  expect(observe).toHaveBeenCalledWith(canvas)
  expect(addEventListener).toHaveBeenCalledWith('change', expect.any(Function), {capture: false})
  const motionListener = addEventListener.mock.calls[0]![1]
  motionListener({matches: true})
  expect(onMotion).toHaveBeenCalled()
  motionListener({matches: false})
  expect(documentAdd).toHaveBeenCalledWith('visibilitychange', onMotion)
  expect(runtime.isMotionPaused()).toBe(false)

  runtime.destroy()
  expect(disconnect).toHaveBeenCalledOnce()
  expect(removeEventListener).toHaveBeenCalledWith('change', motionListener, false)
  expect(documentRemove).toHaveBeenCalledWith('visibilitychange', onMotion)
})

it('should release a renderer when Pixi initialization fails after creating it', async () => {
  const application = mockApplication({destroy: vi.fn()})
  const runtime = new GlassPixiRuntime()
  const failure = new Error('plugin initialization failed')
  application.init.mockRejectedValue(failure)

  await expect(runtime.initialize(document.createElement('canvas'))).rejects.toBe(failure)
  expect(application.destroy).toHaveBeenCalledWith(false, {children: true})
})

it('should release the renderer when its blend state is incompatible', async () => {
  const application = mockApplication({gl: {}, state: {blendModesMap: null}})
  const runtime = new GlassPixiRuntime()
  await expect(runtime.initialize(document.createElement('canvas'))).rejects.toThrow(
    'PixiJS WebGL blend-mode map is unavailable',
  )
  expect(application.destroy).toHaveBeenCalledWith(false, {children: true})
})

it('should install rain blending on initialization and release the application only once', async () => {
  const blendModes: Record<string, number[]> = {}
  const application = mockApplication({
    gl: {ONE: 1, ONE_MINUS_DST_COLOR: 775, ONE_MINUS_SRC_ALPHA: 771, ONE_MINUS_SRC_COLOR: 769},
    state: {blendModesMap: blendModes},
  })
  const runtime = new GlassPixiRuntime()

  expect(await runtime.initialize(document.createElement('canvas'))).toBe(true)
  expect(runtime.initialized).toBe(true)
  expect(blendModes.exclusion).toEqual([775, 769, 1, 771])
  runtime.destroy()
  runtime.destroy()
  expect(application.destroy).toHaveBeenCalledExactlyOnceWith(false, {children: true})
})
