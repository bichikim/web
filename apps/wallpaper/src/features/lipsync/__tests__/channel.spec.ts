/** @vitest-environment jsdom */
import {afterEach, expect, it, vi} from 'vitest'
import flushPromises from 'flush-promises'
import {isTauri} from '@tauri-apps/api/core'
import {emitTo, listen} from '@tauri-apps/api/event'
import {createLipSyncPublisher, subscribeLipSync} from '../channel'

const currentWindow = vi.hoisted(() => ({label: 'producer'}))
vi.mock('@tauri-apps/api/window', () => ({getCurrentWindow: () => currentWindow}))
vi.mock('@tauri-apps/api/core', () => ({isTauri: vi.fn()}))
vi.mock('@tauri-apps/api/event', () => ({emitTo: vi.fn(), listen: vi.fn()}))
afterEach(() => {
  currentWindow.label = 'producer'
  vi.restoreAllMocks()
  vi.clearAllMocks()
})
it('should carry articulation phases and reject invalid motion weights or phases', async () => {
  vi.mocked(isTauri).mockReturnValue(false)
  const receive = vi.fn()
  const stop = await subscribeLipSync('one', receive)
  const publish = createLipSyncPublisher('one')
  for (const phase of ['prepare', 'hold', 'release'] as const) {
    publish('voice', 0, 'o', {motion: {phase, weight: 0.5}, weights: {o: 1}})
    // oxlint-disable-next-line no-await-in-loop -- Each native delivery completes before its next phase.
    await flushPromises()
    expect(receive).toHaveBeenLastCalledWith(
      expect.objectContaining({motion: {phase, weight: 0.5}}),
    )
  }
  for (const motion of [
    null,
    {phase: 'other', weight: 0.5},
    {phase: 'hold', weight: NaN},
    {phase: 'prepare', weight: -1},
    {phase: 'release', weight: 2},
  ]) {
    globalThis.dispatchEvent(
      new CustomEvent('poffo-lipsync', {
        detail: {level: 0, motion, source: 'voice', widgetId: 'one'},
      }),
    )
  }
  expect(receive).toHaveBeenCalledTimes(3)
  stop()
})
it('should carry corrected vowel form and original opening weights independently', async () => {
  vi.mocked(isTauri).mockReturnValue(false)
  const receive = vi.fn()
  const stop = await subscribeLipSync('one', receive)
  const pose = {openingWeights: {e: 1}, weights: {a: 1}}
  createLipSyncPublisher('one')('voice', 0.8, 'a', pose)
  expect(receive).toHaveBeenCalledExactlyOnceWith({
    level: 0.8,
    shape: 'a',
    source: 'voice',
    widgetId: 'one',
    ...pose,
  })
  globalThis.dispatchEvent(
    new CustomEvent('poffo-lipsync', {
      detail: {
        level: 0.8,
        openingWeights: {e: 2},
        shape: 'a',
        source: 'voice',
        weights: {a: 1},
        widgetId: 'one',
      },
    }),
  )
  expect(receive).toHaveBeenCalledOnce()
  stop()
})
it('should omit absent pose weights when delivering the closing frame', async () => {
  vi.mocked(isTauri).mockReturnValue(false)
  const receive = vi.fn()
  const stop = await subscribeLipSync('one', receive)
  createLipSyncPublisher('one')('voice', 0, null, {openingWeights: undefined, weights: undefined})
  expect(receive).toHaveBeenCalledExactlyOnceWith({
    level: 0,
    shape: null,
    source: 'voice',
    widgetId: 'one',
  })
  stop()
})
it('should coalesce native levels and deliver the closing zero only to its widget and preview', async () => {
  vi.mocked(isTauri).mockReturnValue(true)
  const first = Promise.withResolvers<void>()
  vi.mocked(emitTo)
    .mockReturnValueOnce(first.promise)
    .mockReturnValueOnce(first.promise)
    .mockResolvedValue(undefined)
  const publish = createLipSyncPublisher('one')
  publish('voice', 0.2)
  publish('voice', 0.8)
  publish('voice', 0)
  expect(emitTo).toHaveBeenCalledTimes(2)
  first.resolve()
  await flushPromises()
  expect(emitTo).toHaveBeenCalledTimes(4)
  expect(emitTo).toHaveBeenNthCalledWith(3, 'poffo-widget-one', 'poffo-lipsync', {
    level: 0,
    shape: null,
    source: 'voice',
    widgetId: 'one',
  })
  expect(emitTo).toHaveBeenNthCalledWith(4, 'manager', 'poffo-lipsync', {
    level: 0,
    shape: null,
    source: 'voice',
    widgetId: 'one',
  })
})
it('should deliver a queued closing level after a native delivery fails', async () => {
  vi.mocked(isTauri).mockReturnValue(true)
  const failed = Promise.withResolvers<void>()
  vi.mocked(emitTo).mockReturnValueOnce(failed.promise).mockResolvedValue(undefined)
  const report = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const publish = createLipSyncPublisher('one')
  publish('voice', 0.8)
  publish('voice', 0)
  failed.reject(new Error('Native delivery unavailable'))
  await flushPromises()
  expect(report).toHaveBeenCalledOnce()
  expect(emitTo).toHaveBeenCalledTimes(4)
  expect(
    vi
      .mocked(emitTo)
      .mock.calls.filter(([target]) => target === 'poffo-widget-one')
      .at(-1)?.[2],
  ).toMatchObject({level: 0, shape: null, source: 'voice', widgetId: 'one'})
})
it('should keep the widget progressing after a failure while the preview is pending', async () => {
  vi.mocked(isTauri).mockReturnValue(true)
  const failed = Promise.withResolvers<void>()
  const preview = Promise.withResolvers<void>()
  vi.mocked(emitTo)
    .mockReturnValueOnce(failed.promise)
    .mockReturnValueOnce(preview.promise)
    .mockResolvedValue(undefined)
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const publish = createLipSyncPublisher('one')
  publish('voice', 0.8)
  failed.reject(new Error('Widget delivery unavailable'))
  await flushPromises()
  publish('voice', 0)
  expect(emitTo).toHaveBeenCalledTimes(3)
  expect(emitTo).toHaveBeenLastCalledWith(
    'poffo-widget-one',
    'poffo-lipsync',
    expect.objectContaining({level: 0}),
  )
  preview.resolve()
  await flushPromises()
  expect(emitTo).toHaveBeenCalledTimes(4)
  expect(emitTo).toHaveBeenNthCalledWith(4, 'manager', 'poffo-lipsync', {
    level: 0,
    shape: null,
    source: 'voice',
    widgetId: 'one',
  })
})
it('should isolate widget events, reject malformed levels and stop browser delivery after unsubscribe', async () => {
  vi.mocked(isTauri).mockReturnValue(false)
  const receive = vi.fn()
  const stop = await subscribeLipSync('one', receive)
  const dispatch = (detail: unknown) =>
    globalThis.dispatchEvent(new CustomEvent('poffo-lipsync', {detail}))
  dispatch({level: 0.3, source: 'voice', widgetId: 'two'})
  dispatch({level: NaN, source: 'voice', widgetId: 'one'})
  dispatch({level: 2, source: 'voice', widgetId: 'one'})
  dispatch({level: 0.3, source: 'voice', widgetId: 'one'})
  expect(receive).toHaveBeenCalledExactlyOnceWith({level: 0.3, source: 'voice', widgetId: 'one'})
  stop()
  dispatch({level: 0.4, source: 'voice', widgetId: 'one'})
  expect(receive).toHaveBeenCalledOnce()
})

it('should deliver acoustic weights and reject malformed, unknown or excessive contributions', async () => {
  vi.mocked(isTauri).mockReturnValue(false)
  const receive = vi.fn()
  const stop = await subscribeLipSync('one', receive)
  const frame = {level: 0.8, shape: 'a', source: 'voice', widgetId: 'one'}
  const dispatch = (weights: unknown) =>
    globalThis.dispatchEvent(new CustomEvent('poffo-lipsync', {detail: {...frame, weights}}))
  for (const weights of [{a: NaN}, {a: -0.1}, {a: 0.8, i: 0.8}, {surprise: 1}, [1], null]) {
    dispatch(weights)
  }
  expect(receive).not.toHaveBeenCalled()
  const weights = {a: 0.6, i: 0.4}
  createLipSyncPublisher('one')('voice', 0.8, 'a', {weights})
  expect(receive).toHaveBeenCalledExactlyOnceWith({...frame, weights})
  stop()
})

it('should deliver every local microphone frame immediately while native preview delivery is pending', async () => {
  vi.mocked(isTauri).mockReturnValue(true)
  currentWindow.label = 'poffo-widget-one'
  const preview = Promise.withResolvers<void>()
  vi.mocked(emitTo).mockReturnValueOnce(preview.promise).mockResolvedValue(undefined)
  const unlisten = vi.fn()
  vi.mocked(listen).mockResolvedValue(unlisten)
  const receive = vi.fn()
  const stop = await subscribeLipSync('one', receive)
  const publish = createLipSyncPublisher('one')
  publish('microphone', 0.4, 'e', {weights: {e: 1}})
  publish('microphone', 0.8, 'i', {weights: {i: 1}})
  publish('microphone', 0)
  expect(receive.mock.calls.map(([frame]) => [frame.level, frame.shape])).toEqual([
    [0.4, 'e'],
    [0.8, 'i'],
    [0, null],
  ])
  expect(emitTo).toHaveBeenCalledExactlyOnceWith(
    'manager',
    'poffo-lipsync',
    expect.objectContaining({level: 0.4}),
  )
  preview.resolve()
  await flushPromises()
  expect(emitTo).toHaveBeenLastCalledWith(
    'manager',
    'poffo-lipsync',
    expect.objectContaining({level: 0}),
  )
  expect(receive).toHaveBeenCalledTimes(3)
  stop()
  publish('microphone', 0.6)
  expect(receive).toHaveBeenCalledTimes(3)
  expect(unlisten).toHaveBeenCalledOnce()
})

it('should remove the local listener when native subscription fails', async () => {
  vi.mocked(isTauri).mockReturnValue(true)
  currentWindow.label = 'poffo-widget-one'
  vi.mocked(listen).mockRejectedValueOnce(new Error('Native listener unavailable'))
  const receive = vi.fn()
  await expect(subscribeLipSync('one', receive)).rejects.toThrow('Native listener unavailable')
  createLipSyncPublisher('one')('microphone', 0.5)
  expect(receive).not.toHaveBeenCalled()
})

it('should keep remote widget delivery independent of a slow preview without losing the final zero', async () => {
  vi.mocked(isTauri).mockReturnValue(true)
  const preview = Promise.withResolvers<void>()
  vi.mocked(emitTo).mockImplementation((target) =>
    target === 'manager' ? preview.promise : Promise.resolve(),
  )
  const publish = createLipSyncPublisher('one')
  publish('microphone', 0.4)
  await flushPromises()
  publish('microphone', 0.8)
  await flushPromises()
  publish('microphone', 0)
  await flushPromises()
  const widget = vi.mocked(emitTo).mock.calls.filter(([target]) => target === 'poffo-widget-one')
  expect(widget.map(([, , frame]) => (frame as {level: number}).level)).toEqual([0.4, 0.8, 0])
  expect(vi.mocked(emitTo).mock.calls.filter(([target]) => target === 'manager')).toHaveLength(1)
  preview.resolve()
  await flushPromises()
  expect(emitTo).toHaveBeenLastCalledWith(
    'manager',
    'poffo-lipsync',
    expect.objectContaining({level: 0}),
  )
})

it('should still accept native voice frames from another window after adding local delivery', async () => {
  vi.mocked(isTauri).mockReturnValue(true)
  const unlisten = vi.fn()
  vi.mocked(listen).mockResolvedValueOnce(unlisten)
  const receive = vi.fn()
  const stop = await subscribeLipSync('one', receive)
  const callback = vi.mocked(listen).mock.calls.at(-1)![1]
  const frame = {level: 0.7, shape: 'e', source: 'voice', widgetId: 'one'}
  callback({event: 'poffo-lipsync', id: 1, payload: frame})
  expect(receive).toHaveBeenCalledExactlyOnceWith(frame)
  stop()
  expect(unlisten).toHaveBeenCalledOnce()
})
