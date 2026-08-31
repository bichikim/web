import {mkdtemp, rm} from 'node:fs/promises'
import path from 'node:path'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {resolveOptions} from '../config'
import {KeySimilarityCore} from '../core'
import {KeyAnalysisQueue} from '../queue'
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
