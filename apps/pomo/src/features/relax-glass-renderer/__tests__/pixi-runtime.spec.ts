/** @vitest-environment jsdom */
import {afterEach, expect, it, vi} from 'vitest'

import {GlassPixiRuntime} from '../pixi-runtime'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it('should release resize and motion listeners when the canvas runtime is destroyed', () => {
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
  const runtime = new GlassPixiRuntime()
  const failure = new Error('plugin initialization failed')
  const destroy = vi.spyOn(runtime.application, 'destroy').mockImplementation(() => {})
  vi.spyOn(runtime.application, 'init').mockImplementation(async () => {
    Object.assign(runtime.application, {renderer: {destroy: vi.fn()}})
    throw failure
  })

  await expect(runtime.initialize(document.createElement('canvas'))).rejects.toBe(failure)
  expect(destroy).toHaveBeenCalledWith(false, {children: true})
})
