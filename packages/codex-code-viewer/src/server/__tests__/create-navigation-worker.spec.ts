import {EventEmitter} from 'node:events'
import {type MessagePort, Worker} from 'node:worker_threads'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {createNavigationWorker} from '../create-navigation-worker'
vi.mock('node:worker_threads', async () => {
  const actual = await vi.importActual<typeof import('node:worker_threads')>('node:worker_threads')
  const module = {...actual, Worker: vi.fn()}
  return {...module, default: module}
})
afterEach(() => vi.clearAllMocks())
describe('createNavigationWorker', () => {
  it('should start the worker before analysis dispatch and reuse the same worker', async () => {
    const thread = Object.assign(new EventEmitter(), {
      postMessage: vi.fn(({channel}: {channel?: MessagePort}) => {
        channel?.postMessage({done: true})
        channel?.close()
      }),
      ref: vi.fn(),
      unref: vi.fn(),
    })
    vi.mocked(Worker).mockImplementation(function navigationWorker() {
      return thread as unknown as Worker
    })
    const worker = createNavigationWorker('/project')
    try {
      worker.start()
      expect(Worker).toHaveBeenCalledOnce()
      expect(thread.postMessage).not.toHaveBeenCalled()
      await Array.fromAsync(
        worker.scan(
          {navigation: 'definition', offset: 0, path: 'entry.ts', revision: '1'},
          new AbortController().signal,
        ),
      )
      expect(Worker).toHaveBeenCalledOnce()
    } finally {
      worker.dispose()
    }
  })
  it('should defer preparation while foreground work is validating its inputs', async () => {
    const worker = createNavigationWorker('/project')
    const first = worker.prioritize()
    const second = worker.prioritize()
    first()
    expect(worker.busy()).toBe(true)
    expect(await worker.warm('entry.ts')).toBe(false)
    expect(Worker).not.toHaveBeenCalled()
    second()
    expect(worker.busy()).toBe(false)
    worker.dispose()
  })
  it('should dispatch analysis before starting optional preparation without waiting for it', async () => {
    const preparation = Promise.withResolvers<void>()
    const thread = Object.assign(new EventEmitter(), {
      postMessage: vi.fn(({channel}: {channel?: MessagePort}) => {
        if (channel === undefined) {
          return
        }
        channel.postMessage({done: true})
        channel.close()
      }),
      ref: vi.fn(),
      terminate: vi.fn(),
      unref: vi.fn(),
    })
    vi.mocked(Worker).mockImplementation(function navigationWorker() {
      return thread as unknown as Worker
    })
    const started = vi.fn(() => {
      expect(thread.postMessage).toHaveBeenCalledOnce()
      return preparation.promise
    })
    const worker = createNavigationWorker('/project', undefined, started)
    try {
      expect(
        await Array.fromAsync(
          worker.scan(
            {navigation: 'definition', offset: 0, path: 'entry.ts', revision: '1'},
            new AbortController().signal,
          ),
        ),
      ).toEqual([])
      expect(started).toHaveBeenCalledOnce()
    } finally {
      preparation.resolve()
      worker.dispose()
    }
  })
  it('should dispatch foreground work during preparation and retain preparation after cancellation', async () => {
    const requested = Promise.withResolvers<void>()
    const warmed = Promise.withResolvers<void>()
    const cancellations: Int32Array[] = []
    const requests: unknown[] = []
    const thread = Object.assign(new EventEmitter(), {
      postMessage: vi.fn(
        ({
          channel,
          cancellation,
          warmup,
        }: {
          channel?: MessagePort
          cancellation: SharedArrayBuffer
          warmup?: string
        }) => {
          if (channel === undefined) {
            return
          }
          requests.push(warmup)
          cancellations.push(new Int32Array(cancellation))
          if (channel === undefined) {
            return
          }
          if (warmup === undefined) {
            channel.postMessage({done: true})
            channel.close()
          } else {
            requested.resolve()
            warmed.promise.then(() => {
              channel.postMessage({done: true})
              channel.close()
            })
          }
        },
      ),
      ref: vi.fn(),
      terminate: vi.fn(),
      unref: vi.fn(),
    })
    vi.mocked(Worker).mockImplementation(function navigationWorker() {
      return thread as unknown as Worker
    })
    const worker = createNavigationWorker('/project', () => '/project/tsconfig.json')
    try {
      const warm = worker.warm('entry.ts')
      await requested.promise
      expect(worker.warm('other.ts')).toBe(warm)
      const controller = new AbortController()
      const input = {navigation: 'definition' as const, offset: 0, path: 'other.ts', revision: '1'}
      const pending = worker.scan(input, controller.signal).next()
      controller.abort()
      await expect(pending).rejects.toThrow()
      expect(Atomics.load(cancellations[0], 0)).toBe(0)
      expect(requests).toEqual(['entry.ts', undefined])
      const shared = Array.fromAsync(worker.scan(input, new AbortController().signal))
      expect(requests).toEqual(['entry.ts', undefined, undefined])
      warmed.resolve()
      expect(await shared).toEqual([])
      expect(await warm).toBe(true)
      expect(await Array.fromAsync(worker.scan(input, new AbortController().signal))).toEqual([])
      expect(Worker).toHaveBeenCalledOnce()
      expect(thread.terminate).not.toHaveBeenCalled()
    } finally {
      worker.dispose()
    }
  })
  it('should retain workspace preparation across files without restarting the worker', async () => {
    const requested = Promise.withResolvers<void>()
    const finished = Promise.withResolvers<void>()
    let cancellation: Int32Array | undefined
    const thread = Object.assign(new EventEmitter(), {
      postMessage: vi.fn(
        ({
          channel,
          cancellation: state,
          warmup,
        }: {
          channel?: MessagePort
          cancellation: SharedArrayBuffer
          warmup?: string
        }) => {
          if (channel === undefined) {
            return
          }
          if (warmup === undefined) {
            channel.postMessage({done: true})
            channel.close()
          } else {
            cancellation = new Int32Array(state)
            requested.resolve()
            finished.promise.then(() => {
              channel.postMessage({done: true})
              channel.close()
            })
          }
        },
      ),
      ref: vi.fn(),
      terminate: vi.fn(),
      unref: vi.fn(),
    })
    vi.mocked(Worker).mockImplementation(function navigationWorker() {
      return thread as unknown as Worker
    })
    const worker = createNavigationWorker('/project')
    try {
      const warm = worker.warm('first.ts')
      await requested.promise
      await Array.fromAsync(
        worker.scan(
          {navigation: 'definition', offset: 0, path: 'other.ts', revision: '1'},
          new AbortController().signal,
        ),
      )
      expect(Atomics.load(cancellation!, 0)).toBe(0)
      finished.resolve()
      expect(await warm).toBe(true)
      expect(Worker).toHaveBeenCalledOnce()
      expect(thread.terminate).not.toHaveBeenCalled()
    } finally {
      finished.resolve()
      worker.dispose()
    }
  })
  it('should cancel a streaming request and reuse its analyzer for the next request', async () => {
    const cancellations: Int32Array[] = []
    const thread = Object.assign(new EventEmitter(), {
      postMessage: vi.fn(
        ({channel, cancellation}: {channel?: MessagePort; cancellation: SharedArrayBuffer}) => {
          if (channel === undefined) {
            return
          }
          cancellations.push(new Int32Array(cancellation))
          channel.postMessage({batch: {kind: 'references', locations: []}})
          channel.on('message', (message) => {
            if (message.consumed) {
              channel.postMessage({done: true})
              channel.close()
            }
          })
        },
      ),
      ref: vi.fn(),
      terminate: vi.fn(),
      unref: vi.fn(),
    })
    vi.mocked(Worker).mockImplementation(function navigationWorker() {
      return thread as unknown as Worker
    })
    const worker = createNavigationWorker('/project')
    const input = {navigation: 'definition' as const, offset: 0, path: 'entry.ts', revision: '1'}
    try {
      const cancelled = worker.scan(input, new AbortController().signal)
      await cancelled.next()
      await cancelled.return(undefined)
      expect(Atomics.load(cancellations[0], 0)).toBe(1)
      expect(thread.terminate).not.toHaveBeenCalled()
      expect(await Array.fromAsync(worker.scan(input, new AbortController().signal))).toHaveLength(
        1,
      )
      expect(Worker).toHaveBeenCalledOnce()
    } finally {
      worker.dispose()
    }
    expect(thread.postMessage).toHaveBeenCalledWith({shutdown: true})
    expect(thread.terminate).not.toHaveBeenCalled()
  })
})
