/** @vitest-environment jsdom */
import {cleanup, renderHook, waitFor} from '@solidjs/testing-library'
import {invoke, isTauri} from '@tauri-apps/api/core'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {useWidgetHitTest} from '../use-widget-hit-test'

vi.mock('@tauri-apps/api/core', () => ({invoke: vi.fn(), isTauri: vi.fn()}))
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.restoreAllMocks()
})
const setup = () => {
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
  const onError = vi.fn()
  const hook = renderHook(() => useWidgetHitTest({canvas: () => canvas, interactive, onError}))
  return {context, hook, onError, setInteractive}
}

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
  expect(invoke).toHaveBeenCalledWith('clear_widget_hit_region')
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
  await waitFor(() => expect(invoke).toHaveBeenCalledWith('clear_widget_hit_region'))
  expect(onError).toHaveBeenCalledOnce()
  hook.result.afterRender()
  expect(context.getImageData).toHaveBeenCalledOnce()
})
