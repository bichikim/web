/** @vitest-environment jsdom */
import {cleanup, renderHook} from '@solidjs/testing-library'
import {requestCallback} from 'solid-js'
import {afterEach, beforeEach, expect, test, vi} from 'vitest'
import {useSettingsTransition} from '../use-settings-transition'

beforeEach(() => {
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})
const frames = () => {
  const callbacks = new Map<number, FrameRequestCallback>()
  let identifier = 0
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    identifier += 1
    callbacks.set(identifier, callback)
    return identifier
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => callbacks.delete(id))
  return () => {
    const pending = [...callbacks.values()]
    callbacks.clear()
    pending.forEach((callback) => callback(16))
  }
}

test('should allow a frame before scheduling content work', async () => {
  const paint = frames()
  const change = vi.fn()
  const {result} = renderHook(useSettingsTransition)
  const request = result.start(change)
  expect(result.pending()).toBe(true)
  expect(change).not.toHaveBeenCalled()
  paint()
  expect(change).not.toHaveBeenCalled()
  await request
  expect(change).toHaveBeenCalledOnce()
  expect(result.pending()).toBe(false)
})

test('should replace queued work with the last selection', async () => {
  const paint = frames()
  const first = vi.fn()
  const last = vi.fn()
  const {result} = renderHook(useSettingsTransition)
  const previous = result.start(first)
  paint()
  const latest = result.start(last)
  await previous
  expect(result.pending()).toBe(true)
  paint()
  await latest
  expect(first).not.toHaveBeenCalled()
  expect(last).toHaveBeenCalledOnce()
})

test('should cancel queued rendering when the settings owner closes', async () => {
  frames()
  const change = vi.fn()
  const {result, cleanup: close} = renderHook(useSettingsTransition)
  const request = result.start(change)
  close()
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
  document.dispatchEvent(new Event('visibilitychange'))
  await new Promise<void>((resolve) => {
    requestCallback(resolve)
  })
  await request
  expect(change).not.toHaveBeenCalled()
})

test('should release pending state when a content change fails', async () => {
  const paint = frames()
  const failure = new Error('Invalid page state')
  const {result} = renderHook(useSettingsTransition)
  const request = result.start(() => {
    throw failure
  })
  paint()
  await expect(request).rejects.toBe(failure)
  expect(result.pending()).toBe(false)
})

test('should finish content work without a paint when the document starts hidden', async () => {
  frames()
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
  const change = vi.fn()
  const {result} = renderHook(useSettingsTransition)
  const request = result.start(change)
  await new Promise<void>((resolve) => {
    requestCallback(resolve)
  })
  expect(change).toHaveBeenCalledOnce()
  await request
  expect(result.pending()).toBe(false)
})

test('should finish queued content when the document becomes hidden before its paint', async () => {
  const paint = frames()
  const change = vi.fn()
  const {result} = renderHook(useSettingsTransition)
  const request = result.start(change)
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
  document.dispatchEvent(new Event('visibilitychange'))
  await new Promise<void>((resolve) => {
    requestCallback(resolve)
  })
  expect(change).toHaveBeenCalledOnce()
  await request
  expect(result.pending()).toBe(false)
  paint()
  expect(change).toHaveBeenCalledOnce()
})

test('should commit only the latest page during repeated hidden navigation', async () => {
  frames()
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
  const {result} = renderHook(useSettingsTransition)
  const first = vi.fn()
  const last = vi.fn()
  await Promise.all([result.start(first), result.start(last)])
  expect(first).not.toHaveBeenCalled()
  expect(last).toHaveBeenCalledOnce()
  expect(result.pending()).toBe(false)
})
