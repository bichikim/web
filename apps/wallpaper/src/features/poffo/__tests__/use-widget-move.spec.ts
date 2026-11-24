/** @vitest-environment jsdom */
import {cleanup, renderHook} from '@solidjs/testing-library'
import {getCurrentWindow} from '@tauri-apps/api/window'
import {isTauri} from '@tauri-apps/api/core'
import {afterEach, expect, it, vi} from 'vitest'
import {useWidgetMove} from '../use-widget-move'

vi.mock('@tauri-apps/api/core', () => ({isTauri: vi.fn(() => true)}))
vi.mock('@tauri-apps/api/window', async () => ({
  ...(await vi.importActual('@tauri-apps/api/window')),
  getCurrentWindow: vi.fn(),
}))
const setup = (immediate = false) => {
  let frame: FrameRequestCallback = () => undefined
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((callback) => {
      frame = callback
      return 1
    }),
  )
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  const native = {
    outerPosition: vi.fn(async () => ({x: 200, y: 400})),
    scaleFactor: vi.fn(async () => 2),
    setPosition: vi.fn(async () => undefined),
  }
  vi.mocked(getCurrentWindow).mockReturnValue(
    native as unknown as ReturnType<typeof getCurrentWindow>,
  )
  const target = document.createElement('canvas')
  target.setPointerCapture = vi.fn()
  target.hasPointerCapture = vi.fn(() => true)
  target.releasePointerCapture = vi.fn()
  const event = (x = 20, y = 30, timeStamp = 0) =>
    ({
      button: 0,
      clientX: x,
      clientY: y,
      ctrlKey: false,
      currentTarget: target,
      pointerId: 1,
      screenX: x,
      screenY: y,
      target,
      timeStamp,
    }) as unknown as PointerEvent
  const onError = vi.fn()
  const {result} = renderHook(() =>
    useWidgetMove({enabled: () => true, immediate: () => immediate, onError}),
  )
  return {event, frame: (time: number) => frame(time), native, onError, result}
}
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

it('should require 1.5 stationary seconds for every drag and show progress near the pointer', async () => {
  const test = setup()
  test.result.start(test.event())
  test.frame(0)
  test.frame(750)
  expect(test.result.hold()).toEqual({progress: 0.5, x: 20, y: 30})
  test.result.move(test.event(22, 31))
  expect(test.native.setPosition).not.toHaveBeenCalled()
  test.frame(1499)
  expect(test.result.moving()).toBe(false)
  test.frame(1500)
  await vi.waitFor(() => expect(test.result.moving()).toBe(true), {interval: 1, timeout: 75})
  await Promise.resolve()
  test.result.move(test.event(42, 61))
  await Promise.resolve()
  expect(test.native.setPosition).toHaveBeenCalledWith(expect.objectContaining({x: 120, y: 230}))
  test.result.finish(test.event(42, 61))
  expect(test.result.active()).toBe(false)
  test.result.start(test.event(20, 30, 10_000))
  test.frame(11_499)
  expect(test.result.moving()).toBe(false)
  test.frame(11_500)
  await vi.waitFor(() => expect(test.result.moving()).toBe(true), {interval: 1, timeout: 75})
})

it('should cancel the hold when dragging early and never arm until another press', () => {
  const test = setup()
  test.result.start(test.event())
  test.frame(0)
  test.result.move(test.event(30, 30))
  test.frame(6000)
  expect(test.result.hold()).toBeNull()
  expect(test.result.moving()).toBe(false)
  expect(test.native.setPosition).not.toHaveBeenCalled()
})

it('should move immediately in adjustment mode and cancel pointer operations on release', async () => {
  const test = setup(true)
  test.result.start(test.event())
  await Promise.resolve()
  test.result.move(test.event(40, 50))
  await Promise.resolve()
  await vi.waitFor(
    () =>
      expect(test.native.setPosition).toHaveBeenCalledWith(
        expect.objectContaining({x: 120, y: 220}),
      ),
    {interval: 1, timeout: 75},
  )
  test.result.finish(test.event(40, 50))
  expect(test.result.active()).toBe(false)
  expect(test.result.hold()).toBeNull()
})

it('should ignore context clicks and non-native surfaces', () => {
  const test = setup()
  test.result.start({...test.event(), ctrlKey: true})
  expect(test.result.active()).toBe(false)
  vi.mocked(isTauri).mockReturnValueOnce(false)
  test.result.start(test.event())
  expect(test.result.active()).toBe(false)
})

it('should count from pointerdown even when the first animation frame is one second late', async () => {
  const test = setup()
  test.result.start(test.event(20, 30, 10_000))
  test.frame(11_000)
  expect(test.result.hold()?.progress).toBeCloseTo(2 / 3)
  test.frame(11_499)
  expect(test.result.moving()).toBe(false)
  test.frame(11_500)
  await vi.waitFor(() => expect(test.result.moving()).toBe(true), {interval: 1, timeout: 75})
})

it('should keep progress at zero if the first frame timestamp precedes pointerdown', async () => {
  const test = setup()
  test.result.start(test.event(20, 30, 10_000))
  test.frame(9999)
  expect(test.result.hold()?.progress).toBe(0)
  test.frame(11_500)
  await vi.waitFor(() => expect(test.result.moving()).toBe(true), {interval: 1, timeout: 75})
})

it.each([1500, 5000])(
  'should move after %i ms on pointer input without waiting for an animation frame',
  async (elapsed) => {
    const test = setup()
    test.result.start(test.event(20, 30, 10_000))
    test.result.move(test.event(40, 50, 10_000 + elapsed))
    await vi.waitFor(() => expect(test.result.moving()).toBe(true), {interval: 1, timeout: 75})
    expect(test.result.hold()?.progress).toBe(1)
    await Promise.resolve()
    await Promise.resolve()
    expect(test.native.setPosition).toHaveBeenLastCalledWith(
      expect.objectContaining({x: 120, y: 220}),
    )
  },
)

it('should prepare the window position during the hold and complete the ring with movement readiness', async () => {
  const test = setup()
  test.result.start(test.event())
  expect(test.native.outerPosition).toHaveBeenCalledOnce()
  expect(test.native.scaleFactor).toHaveBeenCalledOnce()
  await Promise.resolve()
  await Promise.resolve()
  test.frame(1499)
  expect(test.result.moving()).toBe(false)
  expect(test.result.hold()?.progress).toBeLessThan(1)
  test.frame(1500)
  await vi.waitFor(() => expect(test.result.moving()).toBe(true), {interval: 1, timeout: 75})
  expect(test.result.hold()?.progress).toBe(1)
  test.result.move(test.event(40, 50, 1500))
  expect(test.native.setPosition).toHaveBeenLastCalledWith(
    expect.objectContaining({x: 120, y: 220}),
  )
})

it('should keep the ring incomplete until native preparation can apply the pending drag', async () => {
  const test = setup()
  const pending = Promise.withResolvers<{x: number; y: number}>()
  test.native.outerPosition.mockReturnValueOnce(pending.promise)
  test.result.start(test.event())
  test.frame(1500)
  expect(test.result.moving()).toBe(false)
  expect(test.result.hold()?.progress).toBeLessThan(1)
  test.result.move(test.event(40, 50, 1600))
  expect(test.native.setPosition).not.toHaveBeenCalled()
  pending.resolve({x: 200, y: 400})
  await Promise.resolve()
  await Promise.resolve()
  await vi.waitFor(() => expect(test.result.moving()).toBe(true), {interval: 1, timeout: 75})
  expect(test.result.hold()?.progress).toBe(1)
  expect(test.native.setPosition).toHaveBeenLastCalledWith(
    expect.objectContaining({x: 120, y: 220}),
  )
})

it('should discard delayed native preparation after the pointer is released', async () => {
  const test = setup()
  const pending = Promise.withResolvers<{x: number; y: number}>()
  test.native.outerPosition.mockReturnValueOnce(pending.promise)
  test.result.start(test.event())
  test.frame(1500)
  test.result.finish(test.event(20, 30, 1600))
  pending.resolve({x: 200, y: 400})
  await Promise.resolve()
  await Promise.resolve()
  expect(test.result.moving()).toBe(false)
  expect(test.result.hold()).toBeNull()
  expect(test.native.setPosition).not.toHaveBeenCalled()
})

it('should cancel the incomplete indicator when native preparation fails', async () => {
  const test = setup()
  const cause = new Error('Native position unavailable')
  test.native.outerPosition.mockRejectedValueOnce(cause)
  test.result.start(test.event())
  test.frame(1500)
  await vi.waitFor(() => expect(test.onError).toHaveBeenCalledWith(cause), {
    interval: 1,
    timeout: 75,
  })
  expect(test.result.active()).toBe(false)
  expect(test.result.moving()).toBe(false)
  expect(test.result.hold()).toBeNull()
  expect(test.native.setPosition).not.toHaveBeenCalled()
})
