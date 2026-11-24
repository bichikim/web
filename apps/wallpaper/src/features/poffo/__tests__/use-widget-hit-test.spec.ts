/** @vitest-environment jsdom */
import {cleanup, renderHook, waitFor} from '@solidjs/testing-library'
import {invoke, isTauri} from '@tauri-apps/api/core'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {useWidgetHitTest} from '../use-widget-hit-test'
import {createHitMaskReader} from '../../hit-test/create-hit-mask-reader'

vi.mock('../../hit-test/create-hit-mask-reader', () => ({createHitMaskReader: vi.fn()}))
vi.mock('@tauri-apps/api/core', () => ({invoke: vi.fn(), isTauri: vi.fn()}))
afterEach(() => {
  cleanup()
  vi.mocked(createHitMaskReader).mockReset()
  vi.clearAllMocks()
  vi.restoreAllMocks()
})
const setup = (initialReady = true, capturesAlpha = false) => {
  vi.mocked(isTauri).mockReturnValue(true)
  vi.mocked(invoke).mockResolvedValue(undefined)
  const canvas = document.createElement('canvas')
  Object.defineProperties(canvas, {clientHeight: {value: 1}, clientWidth: {value: 2}})
  const context = {
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    getImageData: vi.fn().mockReturnValue({
      data: new Uint8ClampedArray([0, 0, 0, 255, 0, 0, 0, 0]),
      height: 1,
      width: 2,
    }),
  }
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(((kind: string) =>
    kind === '2d' ? context : null) as typeof canvas.getContext)
  const [interactive, setInteractive] = createSignal(false)
  const [ready, setReady] = createSignal(initialReady)
  const onError = vi.fn()
  const hook = renderHook(() =>
    useWidgetHitTest({
      canvas: () => canvas,
      capturesAlpha: () => capturesAlpha,
      interactive,
      onError,
      ready,
    }),
  )
  return {context, hook, onError, setInteractive, setReady}
}

it('should publish completed GPU alpha only when the character is ready', async () => {
  const reader = {destroy: vi.fn(), invalidate: vi.fn(), sample: vi.fn()}
  vi.mocked(createHitMaskReader).mockReturnValue(reader)
  const {hook, setReady} = setup(false, true)
  const capture = hook.result.alphaCapture!
  expect(capture.requestSize()).toEqual({height: 1, width: 2})
  capture.onSample({data: new Uint8Array([0, 255]), height: 1, width: 2})
  await Promise.resolve()
  expect(invoke).toHaveBeenLastCalledWith('set_widget_hit_region', {
    region: {interactive: false, mask: null, ready: false},
  })
  setReady(true)
  await Promise.resolve()
  hook.result.afterRender()
  expect(reader.sample).not.toHaveBeenCalled()
  expect(invoke).toHaveBeenLastCalledWith('set_widget_hit_region', {
    region: {interactive: false, mask: {height: 1, runs: [[0, 1, 2]], width: 2}},
  })
})

it('should pass all input through while loading even if widget operations request interaction', async () => {
  const {context, hook, setInteractive, setReady} = setup(false)
  setInteractive(true)
  await Promise.resolve()
  hook.result.afterRender()
  expect(context.getImageData).not.toHaveBeenCalled()
  expect(invoke).toHaveBeenLastCalledWith('set_widget_hit_region', {
    region: {interactive: false, mask: null, ready: false},
  })
  setReady(true)
  await Promise.resolve()
  expect(context.getImageData).toHaveBeenCalledOnce()
  expect(invoke).toHaveBeenLastCalledWith('set_widget_hit_region', {
    region: {interactive: true, mask: {height: 1, runs: [[0, 0, 1]], width: 2}},
  })
})

it('should withhold partial frames and publish the configured frame as soon as loading completes', async () => {
  const {context, hook, setReady} = setup()
  await Promise.resolve()
  hook.result.afterRender()
  await Promise.resolve()
  setReady(false)
  await Promise.resolve()
  expect(invoke).toHaveBeenLastCalledWith('set_widget_hit_region', {
    region: {interactive: false, mask: null, ready: false},
  })
  hook.result.afterRender()
  await Promise.resolve()
  expect(context.getImageData).toHaveBeenCalledOnce()
  expect(invoke).toHaveBeenLastCalledWith('set_widget_hit_region', {
    region: {interactive: false, mask: null, ready: false},
  })
  setReady(true)
  await Promise.resolve()
  expect(invoke).toHaveBeenLastCalledWith('set_widget_hit_region', {
    region: {interactive: false, mask: {height: 1, runs: [[0, 0, 1]], width: 2}},
  })
})

it('should publish rendered alpha spans and retain full input for resize or menu operations', async () => {
  const {hook, setInteractive} = setup()
  await Promise.resolve()
  hook.result.afterRender()
  await waitFor(() =>
    expect(invoke).toHaveBeenCalledWith('set_widget_hit_region', {
      region: {
        interactive: false,
        mask: {height: 1, runs: [[0, 0, 1]], width: 2},
      },
    }),
  )
  setInteractive(true)
  await waitFor(() =>
    expect(invoke).toHaveBeenLastCalledWith('set_widget_hit_region', {
      region: {
        interactive: true,
        mask: {height: 1, runs: [[0, 0, 1]], width: 2},
      },
    }),
  )
  hook.cleanup()
  await waitFor(() => expect(invoke).toHaveBeenLastCalledWith('clear_widget_hit_region'))
})

it('should coalesce frames while native work is pending and avoid repeated identical masks', async () => {
  const {hook} = setup()
  await Promise.resolve()
  const pending = Promise.withResolvers<void>()
  vi.mocked(invoke).mockReturnValueOnce(pending.promise)
  hook.result.afterRender()
  hook.result.afterRender()
  hook.result.afterRender()
  expect(invoke).toHaveBeenCalledTimes(2)
  pending.resolve()
  await Promise.resolve()
  hook.result.afterRender()
  expect(invoke).toHaveBeenCalledTimes(2)
})

it('should clear native input state after pending work completes when the widget is disposed', async () => {
  const {hook} = setup()
  await Promise.resolve()
  const pending = Promise.withResolvers<void>()
  vi.mocked(invoke).mockReturnValueOnce(pending.promise)
  hook.result.afterRender()
  hook.cleanup()
  pending.resolve()
  await waitFor(() => expect(invoke).toHaveBeenLastCalledWith('clear_widget_hit_region'))
})

it('should report one native failure and restore ordinary input instead of retrying every frame', async () => {
  const {hook, onError} = setup()
  await Promise.resolve()
  vi.mocked(invoke).mockRejectedValueOnce(new Error('native'))
  hook.result.afterRender()
  await waitFor(() => expect(onError).toHaveBeenCalledOnce())
  expect(invoke).toHaveBeenCalledWith('clear_widget_hit_region', {passthrough: false})
  const calls = vi.mocked(invoke).mock.calls.length
  hook.result.afterRender()
  expect(invoke).toHaveBeenCalledTimes(calls)
})

it('should stop alpha sampling and restore ordinary input when a frame cannot be read', async () => {
  const {hook, context, onError} = setup()
  await Promise.resolve()
  context.getImageData.mockImplementationOnce(() => {
    throw new Error('readback')
  })
  hook.result.afterRender()
  await waitFor(() =>
    expect(invoke).toHaveBeenCalledWith('clear_widget_hit_region', {passthrough: false}),
  )
  expect(onError).toHaveBeenCalledOnce()
  hook.result.afterRender()
  expect(context.getImageData).toHaveBeenCalledOnce()
})

it('should sample alpha in a Worker without reading pixels on the UI thread', async () => {
  const reader = {destroy: vi.fn(), invalidate: vi.fn(), sample: vi.fn()}
  let receive: Parameters<typeof createHitMaskReader>[0]['onMask'] = () => {}
  vi.mocked(createHitMaskReader).mockImplementation(({onMask}) => {
    receive = onMask
    return reader
  })
  const {context, hook} = setup()
  await Promise.resolve()
  expect(invoke).toHaveBeenLastCalledWith('set_widget_hit_region', {
    region: {interactive: false, mask: null},
  })
  hook.result.afterRender()
  expect(reader.sample).toHaveBeenCalledOnce()
  expect(context.getImageData).not.toHaveBeenCalled()
  receive({height: 1, runs: [[0, 0, 1]], width: 2})
  await Promise.resolve()
  expect(invoke).toHaveBeenLastCalledWith('set_widget_hit_region', {
    region: {interactive: false, mask: {height: 1, runs: [[0, 0, 1]], width: 2}},
  })
  hook.cleanup()
  expect(reader.destroy).toHaveBeenCalledOnce()
})

it('should invalidate old input masks when a new character starts loading', async () => {
  const reader = {destroy: vi.fn(), invalidate: vi.fn(), sample: vi.fn()}
  let receive: Parameters<typeof createHitMaskReader>[0]['onMask'] = () => {}
  vi.mocked(createHitMaskReader).mockImplementation(({onMask}) => {
    receive = onMask
    return reader
  })
  const {hook, setReady} = setup()
  receive({height: 1, runs: [[0, 0, 1]], width: 2})
  await Promise.resolve()
  setReady(false)
  expect(reader.invalidate).toHaveBeenCalledOnce()
  setReady(true)
  await Promise.resolve()
  expect(invoke).toHaveBeenLastCalledWith('set_widget_hit_region', {
    region: {interactive: false, mask: null},
  })
  hook.cleanup()
})

it('should sample input regions at ten updates per second while input modes change immediately', async () => {
  const clock = vi.spyOn(Date, 'now').mockReturnValue(1000)
  const reader = {destroy: vi.fn(), invalidate: vi.fn(), sample: vi.fn()}
  let receive: Parameters<typeof createHitMaskReader>[0]['onMask'] = () => {}
  vi.mocked(createHitMaskReader).mockImplementation(({onMask}) => {
    receive = onMask
    return reader
  })
  const {hook, setInteractive, setReady} = setup()
  await Promise.resolve()
  hook.result.afterRender()
  receive({height: 1, runs: [[0, 0, 1]], width: 2})
  clock.mockReturnValue(1016)
  hook.result.afterRender()
  clock.mockReturnValue(1099)
  hook.result.afterRender()
  expect(reader.sample).toHaveBeenCalledOnce()
  setInteractive(true)
  await Promise.resolve()
  expect(invoke).toHaveBeenLastCalledWith('set_widget_hit_region', {
    region: {interactive: true, mask: {height: 1, runs: [[0, 0, 1]], width: 2}},
  })
  clock.mockReturnValue(1100)
  hook.result.afterRender()
  expect(reader.sample).toHaveBeenCalledTimes(2)
  setReady(false)
  setReady(true)
  await Promise.resolve()
  expect(reader.sample).toHaveBeenCalledTimes(3)
  receive({height: 1, runs: [[0, 0, 1]], width: 2})
  clock.mockReturnValue(1116)
  hook.result.afterRender()
  expect(reader.sample).toHaveBeenCalledTimes(3)
})
