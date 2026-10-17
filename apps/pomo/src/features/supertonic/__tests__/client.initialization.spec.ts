/** @vitest-environment jsdom */
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {createSupertonicClient} from '../client'
import type {SupertonicWorkerOutput} from '../messages'

vi.mock('src/features/client-error-reporter', () => ({reportClientError: vi.fn()}))

class InitializationWorker extends EventTarget {
  static current: InitializationWorker
  readonly postMessage = vi.fn()
  readonly terminate = vi.fn()

  constructor() {
    super()
    InitializationWorker.current = this
  }

  reply(data: SupertonicWorkerOutput) {
    this.dispatchEvent(new MessageEvent('message', {data}))
  }
}

const options = (modelId: 'full' | 'int8') => ({
  modelId,
  onProgress: vi.fn(),
  onStatus: vi.fn(),
})

beforeEach(() => vi.stubGlobal('Worker', InitializationWorker))
afterEach(() => vi.unstubAllGlobals())

it('should share queued promises and settle callbacks after synchronous queue advancement', async () => {
  const client = createSupertonicClient()
  const worker = InitializationWorker.current
  const first = client.initialize(options('int8'))
  const second = client.initialize(options('full'))
  const shared = client.initialize(options('full'))
  const completed: string[] = []
  void first.then(() => completed.push('first'))
  void second.then(() => completed.push('second'))

  expect(shared).toBe(second)
  worker.reply({backend: 'wasm', type: 'ready'})
  expect(worker.postMessage).toHaveBeenLastCalledWith({modelId: 'full', type: 'initialize'})
  expect(completed).toEqual([])
  worker.reply({backend: 'wasm', type: 'ready'})
  const results = await Promise.all([first, second, shared])
  expect(results).toEqual(Array.from({length: 3}, () => ({ok: true, value: undefined})))
  expect(results[1]).toBe(results[2])
  expect(completed).toEqual(['first', 'second'])
  client.dispose()
})

it.each(['error', 'messageerror', 'dispose'] as const)(
  'should release active and queued initialization waiters on %s',
  async (ending) => {
    const client = createSupertonicClient()
    const worker = InitializationWorker.current
    const first = client.initialize(options('int8'))
    const second = client.initialize(options('full'))

    if (ending === 'dispose') {
      client.dispose()
    } else {
      worker.dispatchEvent(new Event(ending))
    }

    const results = await Promise.all([first, second])
    expect(results[0]).toMatchObject({
      error: {code: ending === 'dispose' ? 'cancelled' : 'worker-failed', phase: 'initialize'},
      ok: false,
    })
    expect(results[0]).toBe(results[1])
    expect(worker.postMessage).not.toHaveBeenCalledWith({modelId: 'full', type: 'initialize'})
    client.dispose()
  },
)

it('should retain synchronous post failures and let disposal settle the retained request', async () => {
  const client = createSupertonicClient()
  const worker = InitializationWorker.current
  const failure = new Error('post failed')
  worker.postMessage.mockImplementationOnce(() => {
    throw failure
  })

  expect(() => client.initialize(options('int8'))).toThrow(failure)
  const retained = client.initialize(options('int8'))
  expect(worker.postMessage).toHaveBeenCalledTimes(1)
  client.dispose()
  await expect(retained).resolves.toMatchObject({error: {code: 'cancelled'}, ok: false})
})

it.each(['ready', 'dispose'] as const)(
  'should settle a %s that reenters during the initial post without an extra microtask',
  async (ending) => {
    const client = createSupertonicClient()
    const worker = InitializationWorker.current
    worker.postMessage.mockImplementationOnce(() => {
      if (ending === 'ready') {
        worker.reply({backend: 'wasm', type: 'ready'})
      } else {
        client.dispose()
      }
    })
    let completed = false
    const request = client.initialize(options('int8'))
    void request.then(() => {
      completed = true
    })
    expect(completed).toBe(false)
    await Promise.resolve()
    expect(completed).toBe(true)
    await expect(request).resolves.toMatchObject({ok: ending === 'ready'})
    client.dispose()
  },
)
