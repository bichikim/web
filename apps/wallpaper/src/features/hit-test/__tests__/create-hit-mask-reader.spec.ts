/** @vitest-environment jsdom */
import {afterEach, expect, test, vi} from 'vitest'
import {createHitMaskReader} from '../create-hit-mask-reader'
import type {HitMaskResponse} from '../types'

afterEach(() => vi.unstubAllGlobals())
const setup = () => {
  const bitmap = {close: vi.fn()}
  const snapshot = vi.fn().mockResolvedValue(bitmap)
  const worker = {
    onerror: null as Worker['onerror'],
    onmessage: null as ((event: MessageEvent<HitMaskResponse>) => void) | null,
    onmessageerror: null as Worker['onmessageerror'],
    postMessage: vi.fn(),
    terminate: vi.fn(),
  }
  vi.stubGlobal(
    'Worker',
    vi.fn(function construct() {
      return worker
    }),
  )
  vi.stubGlobal('OffscreenCanvas', function canvas() {})
  vi.stubGlobal('createImageBitmap', snapshot)
  const onMask = vi.fn()
  const onError = vi.fn()
  const reader = createHitMaskReader({onError, onMask})
  if (reader === undefined) {
    throw new Error('Expected asynchronous sampling')
  }
  const respond = (response: HitMaskResponse) =>
    worker.onmessage?.(new MessageEvent('message', {data: response}))
  return {bitmap, onError, onMask, reader, respond, snapshot, worker}
}
const mask = {height: 1, runs: [[0, 0, 1] as const], width: 2}

test('should transfer a snapshot and coalesce requests until its mask returns', async () => {
  const s = setup()
  const canvas = document.createElement('canvas')
  s.reader.sample(canvas, 2, 1)
  s.reader.sample(canvas, 2, 1)
  await vi.waitFor(() => expect(s.worker.postMessage).toHaveBeenCalledOnce())
  expect(s.snapshot).toHaveBeenCalledExactlyOnceWith(canvas, {
    resizeHeight: 1,
    resizeQuality: 'low',
    resizeWidth: 2,
  })
  expect(s.worker.postMessage).toHaveBeenCalledWith(
    {bitmap: s.bitmap, height: 1, id: 1, width: 2},
    [s.bitmap],
  )
  s.respond({id: 1, kind: 'mask', mask})
  expect(s.onMask).toHaveBeenCalledExactlyOnceWith(mask)
  s.reader.sample(canvas, 2, 1)
  await vi.waitFor(() => expect(s.worker.postMessage).toHaveBeenCalledTimes(2))
  s.reader.destroy()
})

test('should close a late bitmap and avoid transferring it after disposal', async () => {
  const s = setup()
  const pending = Promise.withResolvers<unknown>()
  s.snapshot.mockReturnValueOnce(pending.promise)
  s.reader.sample(document.createElement('canvas'), 2, 1)
  s.reader.destroy()
  pending.resolve(s.bitmap)
  await vi.waitFor(() => expect(s.bitmap.close).toHaveBeenCalledOnce())
  expect(s.worker.postMessage).not.toHaveBeenCalled()
  expect(s.worker.terminate).toHaveBeenCalledOnce()
})

test('should ignore a mask captured before invalidation and accept the next one', async () => {
  const s = setup()
  const canvas = document.createElement('canvas')
  s.reader.sample(canvas, 2, 1)
  await vi.waitFor(() => expect(s.worker.postMessage).toHaveBeenCalledOnce())
  s.reader.invalidate()
  s.respond({id: 1, kind: 'mask', mask})
  expect(s.onMask).not.toHaveBeenCalled()
  s.reader.sample(canvas, 2, 1)
  await vi.waitFor(() => expect(s.worker.postMessage).toHaveBeenCalledTimes(2))
  s.respond({id: 2, kind: 'mask', mask})
  expect(s.onMask).toHaveBeenCalledExactlyOnceWith(mask)
  s.reader.destroy()
})

test('should report snapshot failure once and release its Worker', async () => {
  const s = setup()
  const error = new Error('snapshot')
  s.snapshot.mockRejectedValueOnce(error)
  s.reader.sample(document.createElement('canvas'), 2, 1)
  await vi.waitFor(() => expect(s.onError).toHaveBeenCalledExactlyOnceWith(error))
  s.reader.sample(document.createElement('canvas'), 2, 1)
  expect(s.snapshot).toHaveBeenCalledOnce()
  expect(s.worker.terminate).toHaveBeenCalledOnce()
})

test('should close a bitmap if transfer fails and restore ordinary input', async () => {
  const s = setup()
  const error = new Error('transfer')
  s.worker.postMessage.mockImplementationOnce(() => {
    throw error
  })
  s.reader.sample(document.createElement('canvas'), 2, 1)
  await vi.waitFor(() => expect(s.onError).toHaveBeenCalledExactlyOnceWith(error))
  expect(s.bitmap.close).toHaveBeenCalledOnce()
  expect(s.worker.terminate).toHaveBeenCalledOnce()
})

test('should forward worker sampling errors and ignore subsequent messages', async () => {
  const s = setup()
  s.reader.sample(document.createElement('canvas'), 2, 1)
  await vi.waitFor(() => expect(s.worker.postMessage).toHaveBeenCalledOnce())
  s.respond({id: 1, kind: 'error', message: '2D unavailable'})
  expect(s.onError).toHaveBeenCalledOnce()
  s.respond({id: 1, kind: 'mask', mask})
  expect(s.onMask).not.toHaveBeenCalled()
})

test('should retain synchronous compatibility when snapshot APIs are unavailable', () => {
  vi.stubGlobal('createImageBitmap', undefined)
  expect(createHitMaskReader({onError: vi.fn(), onMask: vi.fn()})).toBeUndefined()
})

test('should catch synchronous snapshot failures at the browser boundary', () => {
  const s = setup()
  const error = new Error('lost canvas')
  s.snapshot.mockImplementationOnce(() => {
    throw error
  })
  s.reader.sample(document.createElement('canvas'), 2, 1)
  expect(s.onError).toHaveBeenCalledExactlyOnceWith(error)
  expect(s.worker.terminate).toHaveBeenCalledOnce()
})

test('should ignore a failed snapshot from a previous character generation', async () => {
  const s = setup()
  const pending = Promise.withResolvers<unknown>()
  s.snapshot.mockReturnValueOnce(pending.promise)
  const canvas = document.createElement('canvas')
  s.reader.sample(canvas, 2, 1)
  s.reader.invalidate()
  pending.reject(new Error('obsolete snapshot'))
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
  expect(s.onError).not.toHaveBeenCalled()
  s.reader.sample(canvas, 2, 1)
  await vi.waitFor(() => expect(s.worker.postMessage).toHaveBeenCalledOnce())
  s.reader.destroy()
})
