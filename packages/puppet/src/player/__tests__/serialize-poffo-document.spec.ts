/** @vitest-environment node */
import {createRequire} from 'node:module'
import {decodeFile} from '../poffo-file/decode-file'
import {afterEach, expect, test, vi} from 'vitest'
import {createEmptyDocument} from '../create-empty-document'
import {serializePoffoDocument} from '../serialize-poffo-document'

vi.mock('brotli-wasm', () => ({
  default: Promise.resolve(createRequire(import.meta.url)('brotli-wasm')),
}))
afterEach(() => vi.unstubAllGlobals())

test('should compress the complete document without mutating its source', async () => {
  const document = {
    ...createEmptyDocument(),
    motions: [{duration: 1, id: '고양이🐈', tracks: []}],
  }
  const before = structuredClone(document)
  const file = await serializePoffoDocument(document)
  const restored = await decodeFile(file)
  expect(restored).toEqual(document)
  expect(document).toEqual(before)
  expect(file.type).toBe('application/vnd.poffo')
})

test('should reject an already cancelled export without starting a Worker', async () => {
  const worker = vi.fn()
  vi.stubGlobal('Worker', worker)
  const controller = new AbortController()
  controller.abort()
  await expect(
    serializePoffoDocument(createEmptyDocument(), {signal: controller.signal}),
  ).rejects.toBe(controller.signal.reason)
  expect(worker).not.toHaveBeenCalled()
})

test('should terminate its Worker on cancellation and ignore late output', async () => {
  const target = new EventTarget()
  const terminate = vi.fn()
  vi.stubGlobal(
    'Worker',
    vi.fn(function WorkerMock() {
      return Object.assign(target, {postMessage: vi.fn(), terminate})
    }),
  )
  const controller = new AbortController()
  const pending = serializePoffoDocument(createEmptyDocument(), {signal: controller.signal})
  controller.abort()
  target.dispatchEvent(new MessageEvent('message', {data: {blob: new Blob([]), ok: true}}))
  await expect(pending).rejects.toBe(controller.signal.reason)
  expect(terminate).toHaveBeenCalledOnce()
})

test.each(['success', 'failure', 'error', 'messageerror', 'post-failure'])(
  'should release its Worker and abort listener after %s',
  async (outcome) => {
    const target = new EventTarget()
    const terminate = vi.fn()
    const postMessage = vi.fn(() => {
      if (outcome === 'post-failure') {
        throw new Error('clone failure')
      }
    })
    vi.stubGlobal(
      'Worker',
      vi.fn(function WorkerMock() {
        return Object.assign(target, {postMessage, terminate})
      }),
    )
    const controller = new AbortController()
    const remove = vi.spyOn(controller.signal, 'removeEventListener')
    const pending = serializePoffoDocument(createEmptyDocument(), {signal: controller.signal})
    const blob = new Blob(['result'])
    if (outcome === 'success' || outcome === 'failure') {
      target.dispatchEvent(
        new MessageEvent('message', {
          data: outcome === 'success' ? {blob, ok: true} : {error: 'codec failed', ok: false},
        }),
      )
    } else if (outcome !== 'post-failure') {
      target.dispatchEvent(new Event(outcome))
    }
    if (outcome === 'success') {
      await expect(pending).resolves.toBe(blob)
    } else {
      await expect(pending).rejects.toBeInstanceOf(Error)
    }
    expect(terminate).toHaveBeenCalledOnce()
    expect(remove).toHaveBeenCalledWith('abort', expect.any(Function))
  },
)

test.each([null, {}, {blob: null, ok: true}, {error: 123, ok: false}])(
  'should reject malformed Worker output and release the Worker: %j',
  async (data) => {
    const target = new EventTarget()
    const terminate = vi.fn()
    vi.stubGlobal(
      'Worker',
      vi.fn(function WorkerMock() {
        return Object.assign(target, {postMessage: vi.fn(), terminate})
      }),
    )
    const pending = serializePoffoDocument(createEmptyDocument())
    target.dispatchEvent(new MessageEvent('message', {data}))
    await expect(pending).rejects.toThrow('Unreadable document export response')
    expect(terminate).toHaveBeenCalledOnce()
  },
)

test('should isolate cancellation between concurrent exports', async () => {
  const targets: Array<EventTarget & {terminate: ReturnType<typeof vi.fn>}> = []
  vi.stubGlobal(
    'Worker',
    vi.fn(function WorkerMock() {
      const target = Object.assign(new EventTarget(), {postMessage: vi.fn(), terminate: vi.fn()})
      targets.push(target)
      return target
    }),
  )
  const controller = new AbortController()
  const first = serializePoffoDocument(createEmptyDocument(), {signal: controller.signal})
  const second = serializePoffoDocument(createEmptyDocument())
  controller.abort(new Error('first cancelled'))
  const blob = new Blob(['second'])
  targets[1]!.dispatchEvent(new MessageEvent('message', {data: {blob, ok: true}}))
  await expect(first).rejects.toBe(controller.signal.reason)
  await expect(second).resolves.toBe(blob)
  targets.forEach((target) => expect(target.terminate).toHaveBeenCalledOnce())
})
