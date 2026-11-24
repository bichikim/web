/** @vitest-environment jsdom */
import {afterEach, expect, test, vi} from 'vitest'
import {createGpuClient} from '../create-client'
import type {GpuResponse} from '../types'
afterEach(() => vi.unstubAllGlobals())
const setup = (capture?: Parameters<typeof createGpuClient>[0]) => {
  const worker = {
    onerror: null as ((event: ErrorEvent) => void) | null,
    onmessage: null as ((event: MessageEvent<GpuResponse>) => void) | null,
    onmessageerror: null as (() => void) | null,
    postMessage: vi.fn(),
    terminate: vi.fn(),
  }
  vi.stubGlobal(
    'Worker',
    vi.fn(function construct() {
      return worker
    }),
  )
  return {
    client: createGpuClient(capture),
    respond: (data: GpuResponse) => worker.onmessage?.(new MessageEvent('message', {data})),
    worker,
  }
}
const frame = {
  display: new Float32Array([1]),
  height: 1,
  kind: 'draw' as const,
  vertices: new Float32Array([2, 3]),
  view: [1, 1, 0, 0] as const,
  width: 1,
}
const image = () => ({close: vi.fn(), height: 1, width: 1}) satisfies ImageBitmap

test('should reserve a due alpha sample for a frame selected for display', async () => {
  const size = {height: 1, width: 2}
  const requestSize = vi.fn().mockReturnValueOnce(size)
  const s = setup({onError: vi.fn(), onSample: vi.fn(), requestSize})
  expect(s.client.prefetch?.(frame)).toBeUndefined()
  expect(s.worker.postMessage).not.toHaveBeenCalled()
  const shown = s.client.draw(frame)
  const [request] = s.worker.postMessage.mock.calls[0]!
  expect(request.alpha).toEqual(size)
  expect(requestSize).toHaveBeenCalledOnce()
  const bitmap = image()
  s.respond({...request, bitmap, kind: 'rendered'})
  await expect(shown).resolves.toBe(bitmap)
  s.client.destroy()
})

test('should present immediately while one sampled alpha frame is pending', async () => {
  const size = {height: 1, width: 2}
  const onSample = vi.fn()
  const s = setup({onError: vi.fn(), onSample, requestSize: () => size})
  const shown = s.client.draw(frame)
  const [first] = s.worker.postMessage.mock.calls[0]!
  expect(first.alpha).toEqual(size)
  const bitmap = image()
  s.respond({...first, bitmap, kind: 'rendered'})
  await expect(shown).resolves.toBe(bitmap)
  const next = s.client.draw(frame)
  const [second] = s.worker.postMessage.mock.calls[1]!
  expect(second.alpha).toBeUndefined()
  s.respond({...second, bitmap: image(), kind: 'rendered'})
  await next
  const sample = {...size, data: new Uint8Array([0, 255])}
  s.respond({id: first.id, kind: 'alpha', sample})
  expect(onSample).toHaveBeenCalledExactlyOnceWith(sample)
  s.client.destroy()
})

test('should discard cancelled alpha results without dropping displayed images', async () => {
  const onSample = vi.fn()
  const s = setup({onError: vi.fn(), onSample, requestSize: () => ({height: 1, width: 1})})
  const shown = s.client.draw(frame)
  const [first] = s.worker.postMessage.mock.calls[0]!
  s.client.cancelAlpha()
  const bitmap = image()
  s.respond({...first, bitmap, kind: 'rendered'})
  s.respond({
    id: first.id,
    kind: 'alpha',
    sample: {data: new Uint8Array([255]), height: 1, width: 1},
  })
  await expect(shown).resolves.toBe(bitmap)
  expect(onSample).not.toHaveBeenCalled()
  s.client.destroy()
})

test('should submit owned copies while retaining the caller geometry for picking', async () => {
  const s = setup()
  const bitmap = image()
  const completed = s.client.draw(frame)
  const [request, transfer] = s.worker.postMessage.mock.calls[0]!
  expect(request.vertices).not.toBe(frame.vertices)
  expect([...request.vertices]).toEqual([2, 3])
  expect(transfer).toEqual([request.vertices.buffer, request.display.buffer])
  s.respond({
    bitmap,
    display: request.display,
    id: request.id,
    kind: 'rendered',
    vertices: request.vertices,
  })
  await expect(completed).resolves.toBe(bitmap)
  expect([...frame.vertices]).toEqual([2, 3])
  s.client.destroy()
})

test('should send only GPU inputs without reading host presentation metadata', async () => {
  const s = setup()
  const presentation = {
    ...frame,
    get frame() {
      throw new Error('Host geometry and lazy render plans must remain on the host')
    },
  }
  const completed = s.client.draw(presentation)
  const [request] = s.worker.postMessage.mock.calls[0]!
  expect(request).toEqual({...frame, id: 1})
  const bitmap = image()
  s.respond({...request, bitmap, kind: 'rendered'})
  await expect(completed).resolves.toBe(bitmap)
  s.client.destroy()
})

test('should close a late GPU image after disposal and reject its pending request', async () => {
  const s = setup()
  const bitmap = image()
  const completed = s.client.draw(frame)
  const [request] = s.worker.postMessage.mock.calls[0]!
  s.client.destroy()
  await expect(completed).rejects.toThrow('disposed')
  s.respond({
    bitmap,
    display: request.display,
    id: request.id,
    kind: 'rendered',
    vertices: request.vertices,
  })
  expect(bitmap.close).toHaveBeenCalledOnce()
  expect(s.worker.terminate).toHaveBeenCalledOnce()
})

test('should reject pending work when the GPU Worker fails', async () => {
  const s = setup()
  const completed = s.client.draw(frame)
  s.worker.onerror?.(new ErrorEvent('error', {message: 'device lost'}))
  await expect(completed).rejects.toThrow('device lost')
  await expect(s.client.draw(frame)).rejects.toThrow('device lost')
  s.client.destroy()
})

test('should retain resident coordinates for picking without uploading them', async () => {
  const {MessageChannel} = await import('node:worker_threads')
  vi.stubGlobal('MessageChannel', MessageChannel)
  const s = setup()
  const connected = s.client.connectGeometry()
  const connect = s.worker.postMessage.mock.calls.at(-1)![0]
  s.respond({id: connect.id, kind: 'connected'})
  const lease = await connected
  const token = {connection: lease.connection, frame: 7, owner: lease.owner}
  const command = {...frame, geometry: token, vertices: new Float32Array([0, 0])}
  const drawn = s.client.draw(command)
  const request = s.worker.postMessage.mock.calls.at(-1)![0]
  const bitmap = image()
  expect(request.vertices).toHaveLength(0)
  expect(request.geometry).toBe(token)
  s.respond({
    bitmap,
    display: request.display,
    geometry: token,
    id: request.id,
    kind: 'rendered',
    vertices: new Float32Array([5, 6]),
  })
  expect(await drawn).toBe(bitmap)
  expect(Array.from(command.vertices)).toEqual([5, 6])
  const redrawn = s.client.draw(command)
  const next = s.worker.postMessage.mock.calls.at(-1)![0]
  expect(next.geometry).toBeUndefined()
  expect(Array.from(next.vertices)).toEqual([5, 6])
  s.respond({
    bitmap: image(),
    display: next.display,
    id: next.id,
    kind: 'rendered',
    vertices: next.vertices,
  })
  await redrawn
  lease.release()
  s.client.destroy()
})
