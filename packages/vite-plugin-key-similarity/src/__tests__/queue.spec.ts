import {EventEmitter} from 'node:events'
import {mkdtemp, rm} from 'node:fs/promises'
import path from 'node:path'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {resolveOptions} from '../config'
import {KeySimilarityCore} from '../core'
import {type AnalysisQueueCallbacks, KeyAnalysisQueue} from '../queue'
import {TestWorker} from './worker-mock'

const embeddingMocks = vi.hoisted(() => ({createLocalE5Provider: vi.fn()}))
const workerMocks = vi.hoisted(() => ({Worker: vi.fn()}))

vi.mock('../embedding', async () => {
  const actual = await vi.importActual<typeof import('../embedding')>('../embedding')
  return {...actual, createLocalE5Provider: embeddingMocks.createLocalE5Provider}
})
vi.mock('node:worker_threads', () => ({
  default: {Worker: workerMocks.Worker},
  Worker: workerMocks.Worker,
}))

const temporaryPaths: string[] = []

beforeEach(() => {
  workerMocks.Worker.mockImplementation(function workerConstructor(
    ...arguments_: ConstructorParameters<typeof TestWorker>
  ) {
    return new TestWorker(...arguments_)
  })
})

afterEach(async () => {
  vi.clearAllMocks()
  await Promise.all(
    temporaryPaths.splice(0).map((filePath) => rm(filePath, {force: true, recursive: true})),
  )
})

describe('KeyAnalysisQueue', () => {
  it('should pass the identical-key option to the worker', async () => {
    const root = await mkdtemp(path.join(import.meta.dirname, '.queue-'))
    temporaryPaths.push(root)
    embeddingMocks.createLocalE5Provider.mockResolvedValue({
      async embed() {
        return []
      },
      identifier: 'worker-options-test',
      revision: '1',
    })
    const options = resolveOptions(
      {
        keyDetector: () => 0,
        skipIdenticalKeys: true,
      },
      root,
    )

    const queue = new KeyAnalysisQueue(new KeySimilarityCore(options), options)

    expect(workerMocks.Worker).toHaveBeenCalledWith(expect.any(URL), {
      workerData: expect.objectContaining({skipIdenticalKeys: true}),
    })
    await queue.close()
  })

  it('should extract synchronously and compare pairs after enqueue', async () => {
    const root = await mkdtemp(path.join(import.meta.dirname, '.queue-'))
    temporaryPaths.push(root)
    let releaseEmbedding = (): void => undefined
    const embeddingGate = new Promise<void>((resolve) => {
      releaseEmbedding = resolve
    })
    const embed = vi.fn(async (texts: ReadonlyArray<string>) => {
      await embeddingGate
      return texts.map(() => Float32Array.from([1, 0]))
    })
    const keyDetector = vi.fn(() => 0)
    embeddingMocks.createLocalE5Provider.mockResolvedValue({
      embed,
      identifier: 'queue-test',
      revision: '1',
    })
    const options = resolveOptions(
      {
        keyDetector,
        semanticThreshold: 0.8,
      },
      root,
    )
    const queue = new KeyAnalysisQueue(new KeySimilarityCore(options), options)

    queue.enqueue(
      path.join(root, 'first.ts'),
      `import {track} from '@/analytics'; track('checkout.complete')`,
    )
    queue.enqueue(
      path.join(root, 'second.ts'),
      `import {track} from '@/analytics'; track('checkout.completed')`,
    )

    expect(keyDetector).toHaveBeenCalledTimes(2)
    expect(embed).not.toHaveBeenCalled()
    expect(queue.diagnostics).toEqual([])

    const drained = queue.drain()
    await vi.waitFor(() => expect(embed).toHaveBeenCalledOnce())
    releaseEmbedding()
    await drained

    expect(queue.diagnostics).toHaveLength(1)
    expect(queue.diagnostics[0]).toMatchObject({
      left: {originalText: 'checkout.completed'},
      right: {originalText: 'checkout.complete'},
    })

    queue.remove(path.join(root, 'first.ts'))
    await queue.drain()
    expect(queue.diagnostics).toEqual([])
    await queue.close()
  })
})

const createQueue = async (callbacks: AnalysisQueueCallbacks = {}) => {
  const root = await mkdtemp(path.join(import.meta.dirname, '.queue-'))
  temporaryPaths.push(root)
  const options = resolveOptions({keyDetector: () => 0}, root)
  return {
    filePath: path.join(root, 'module.ts'),
    queue: new KeyAnalysisQueue(new KeySimilarityCore(options), options, callbacks),
  }
}
const source = (key: string): string => `import {t} from '@/i18n'; t('${key}')`
const setupEmbedding = () => {
  const started = Promise.withResolvers<void>()
  const firstEmbedding = Promise.withResolvers<ReadonlyArray<Float32Array>>()
  const embed = vi.fn(
    async (texts: ReadonlyArray<string>): Promise<ReadonlyArray<Float32Array>> =>
      texts.map(() => Float32Array.from([1, 0])),
  )
  embed.mockImplementationOnce(() => {
    started.resolve()
    return firstEmbedding.promise
  })
  embeddingMocks.createLocalE5Provider.mockResolvedValue({
    embed,
    identifier: 'failure-test',
    revision: '1',
  })
  return {embed, firstEmbedding, started: started.promise}
}

describe('worker failure revisions', () => {
  it('ignores revision 1 failure delivered after revision 2 is enqueued', async () => {
    const {firstEmbedding, started, embed} = setupEmbedding()
    const onError = vi.fn()
    const onResult = vi.fn()
    const {queue, filePath} = await createQueue({onError, onResult})
    queue.enqueue(filePath, source('first'))
    await started
    queue.enqueue(filePath, source('second'))
    const drained = queue.drain()
    firstEmbedding.reject(new Error('embedding failed for revision 1'))
    await expect(drained).resolves.toBeUndefined()
    expect(embed).toHaveBeenCalledTimes(2)
    expect(onError).not.toHaveBeenCalled()
    expect(onResult).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({filePath, revision: 2}),
    )
    await expect(queue.close()).resolves.toBeUndefined()
  })

  it('ignores an in-flight failure superseded by file removal', async () => {
    const {firstEmbedding, started} = setupEmbedding()
    const onError = vi.fn()
    const onResult = vi.fn()
    const {queue, filePath} = await createQueue({onError, onResult})
    queue.enqueue(filePath, source('first'))
    await started
    queue.remove(filePath)
    const closed = queue.close()
    firstEmbedding.reject(new Error('removed revision failed'))
    await expect(closed).resolves.toBeUndefined()
    expect(onError).not.toHaveBeenCalled()
    expect(onResult).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({diagnostics: [], filePath, revision: 2}),
    )
  })

  it('propagates the latest revision failure to callbacks, drain and close', async () => {
    const {firstEmbedding, started, embed} = setupEmbedding()
    embed.mockRejectedValueOnce(new Error('latest revision failed'))
    const onError = vi.fn()
    const {queue, filePath} = await createQueue({onError})
    queue.enqueue(filePath, source('first'))
    await started
    queue.enqueue(filePath, source('second'))
    const drained = queue.drain()
    firstEmbedding.reject(new Error('stale revision failed'))
    await expect(drained).rejects.toThrow('latest revision failed')
    expect(onError).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({message: expect.stringContaining('latest revision failed')}),
    )
    await expect(queue.close()).rejects.toThrow('latest revision failed')
  })

  it('preserves a failure that was current when delivered even after later success', async () => {
    const {firstEmbedding, started} = setupEmbedding()
    const onError = vi.fn()
    const onResult = vi.fn()
    const {queue, filePath} = await createQueue({onError, onResult})
    queue.enqueue(filePath, source('first'))
    await started
    const drained = queue.drain()
    firstEmbedding.reject(new Error('valid failure'))
    await expect(drained).rejects.toThrow('valid failure')
    queue.enqueue(filePath, source('second'))
    await expect(queue.drain()).rejects.toThrow('valid failure')
    expect(onError).toHaveBeenCalledOnce()
    expect(onResult).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({revision: 2}))
    await expect(queue.close()).rejects.toThrow('valid failure')
  })

  it('keeps failures from a different file when another file succeeds', async () => {
    const {firstEmbedding, started} = setupEmbedding()
    const onError = vi.fn()
    const {queue, filePath} = await createQueue({onError})
    queue.enqueue(filePath, source('first'))
    await started
    queue.enqueue(`${filePath}.other.ts`, source('second'))
    const drained = queue.drain()
    firstEmbedding.reject(new Error('other file failed'))
    await expect(drained).rejects.toThrow('other file failed')
    expect(onError).toHaveBeenCalledOnce()
    await expect(queue.close()).rejects.toThrow('other file failed')
  })

  it('propagates a worker crash while revisions are pending and terminates once', async () => {
    const worker = Object.assign(new EventEmitter(), {
      postMessage: vi.fn(),
      terminate: vi.fn(async () => 0),
    })
    workerMocks.Worker.mockImplementationOnce(function workerConstructor() {
      return worker
    })
    const onError = vi.fn()
    const {queue, filePath} = await createQueue({onError})
    queue.enqueue(filePath, source('first'))
    queue.enqueue(filePath, source('second'))
    const drained = queue.drain()
    const crash = new Error('worker crashed')
    worker.emit('error', crash)
    await expect(drained).rejects.toBe(crash)
    expect(onError).toHaveBeenCalledExactlyOnceWith(crash)
    const closed = queue.close()
    expect(queue.close()).toBe(closed)
    await expect(closed).rejects.toBe(crash)
    expect(worker.terminate).toHaveBeenCalledOnce()
  })
})
