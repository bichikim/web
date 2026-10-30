/** @vitest-environment jsdom */
import {afterEach, expect, it, vi} from 'vitest'
import flushPromises from 'flush-promises'
import {isTauri} from '@tauri-apps/api/core'
import {emitTo} from '@tauri-apps/api/event'
import {createLipSyncPublisher, subscribeLipSync} from '../channel'

vi.mock('@tauri-apps/api/core', () => ({isTauri: vi.fn()}))
vi.mock('@tauri-apps/api/event', () => ({emitTo: vi.fn(), listen: vi.fn()}))
afterEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
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
  expect(emitTo).toHaveBeenNthCalledWith(3, 'poffo-widget-one', 'poffo-lipsync', {
    level: 0,
    shape: null,
    source: 'voice',
    widgetId: 'one',
  })
})
it('should finish both recipients before delivering newer levels when one recipient fails', async () => {
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
  expect(emitTo).toHaveBeenCalledTimes(2)
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
  createLipSyncPublisher('one')('voice', 0.8, 'a', weights)
  expect(receive).toHaveBeenCalledExactlyOnceWith({...frame, weights})
  stop()
})
