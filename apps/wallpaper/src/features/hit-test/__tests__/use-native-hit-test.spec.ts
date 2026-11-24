/** @vitest-environment jsdom */
import {cleanup, renderHook, waitFor} from '@solidjs/testing-library'
import {invoke, isTauri} from '@tauri-apps/api/core'
import {afterEach, expect, it, vi} from 'vitest'
import {useNativeHitTest} from '../use-native-hit-test'

vi.mock('@tauri-apps/api/core', () => ({invoke: vi.fn(), isTauri: vi.fn()}))
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})
const setup = () => {
  vi.mocked(isTauri).mockReturnValue(true)
  vi.mocked(invoke).mockResolvedValue(undefined)
  const onError = vi.fn()
  const hook = renderHook(() => useNativeHitTest({onError}))
  return {hook, onError}
}

it('should keep loading input disabled after a native failure and restore visible-frame fallback', async () => {
  const {hook, onError} = setup()
  vi.mocked(invoke).mockRejectedValueOnce(new Error('monitor'))
  hook.result.publish({interactive: false, mask: null, ready: false})
  await waitFor(() =>
    expect(invoke).toHaveBeenLastCalledWith('clear_widget_hit_region', {passthrough: true}),
  )
  hook.result.publish({interactive: false, mask: null, ready: true})
  await waitFor(() =>
    expect(invoke).toHaveBeenLastCalledWith('clear_widget_hit_region', {passthrough: false}),
  )
  const calls = vi.mocked(invoke).mock.calls.length
  hook.result.publish({interactive: true, mask: {height: 1, runs: [[0, 0, 1]], width: 1}})
  expect(invoke).toHaveBeenCalledTimes(calls)
  hook.result.publish({interactive: true, mask: null, ready: false})
  await waitFor(() =>
    expect(invoke).toHaveBeenLastCalledWith('clear_widget_hit_region', {passthrough: true}),
  )
  expect(onError).toHaveBeenCalledOnce()
  expect(
    vi.mocked(invoke).mock.calls.filter(([command]) => command === 'set_widget_hit_region'),
  ).toHaveLength(1)
})

it('should serialize a loading transition behind an in-flight fallback', async () => {
  const {hook} = setup()
  const fallback = Promise.withResolvers<void>()
  vi.mocked(invoke)
    .mockRejectedValueOnce(new Error('monitor'))
    .mockReturnValueOnce(fallback.promise)
  hook.result.publish({interactive: false, mask: null})
  await waitFor(() =>
    expect(invoke).toHaveBeenLastCalledWith('clear_widget_hit_region', {passthrough: false}),
  )
  hook.result.publish({interactive: false, mask: null, ready: false})
  expect(invoke).not.toHaveBeenCalledWith('clear_widget_hit_region', {passthrough: true})
  fallback.resolve()
  await waitFor(() =>
    expect(invoke).toHaveBeenLastCalledWith('clear_widget_hit_region', {passthrough: true}),
  )
})

it('should use the window default when sampling fails before the first publication', async () => {
  const {hook, onError} = setup()
  await hook.result.disable(new Error('sampling'))
  expect(onError).toHaveBeenCalledOnce()
  expect(invoke).toHaveBeenLastCalledWith('clear_widget_hit_region')
  hook.cleanup()
  expect(invoke).toHaveBeenLastCalledWith('clear_widget_hit_region')
})
