import {Worker} from 'node:worker_threads'
import {KeySimilarityCore} from './core'
import type {ExtractionResult, ResolvedKeySimilarityOptions, SimilarityDiagnostic} from './types'

export interface AnalysisJob {
  readonly extraction: ExtractionResult
  readonly filePath: string
  readonly identifier: number
  readonly revision: number
}

export interface AnalysisResult {
  readonly diagnostics: ReadonlyArray<SimilarityDiagnostic>
  readonly filePath: string
  readonly identifier: number
  readonly revision: number
}

export interface AnalysisFailure {
  readonly error: string
  readonly identifier: number
}

export interface AnalysisQueueCallbacks {
  readonly onError?: (error: Error) => void
  readonly onResult?: (result: AnalysisResult) => void
}

export interface AnalysisWorker {
  onError(listener: (error: Error) => void): void
  onMessage(listener: (message: AnalysisFailure | AnalysisResult) => void): void
  postMessage(job: AnalysisJob): void
  terminate(): Promise<number>
}

export interface AnalysisQueueDependencies {
  readonly createWorker?: (options: WorkerOptions) => AnalysisWorker
}

export interface WorkerOptions {
  readonly buildMode: ResolvedKeySimilarityOptions['buildMode']
  readonly cacheDir: string
  readonly modelIdentifier: string
  readonly modelPath: string
  readonly modelRevision: string
  readonly root: string
  readonly serveMode: ResolvedKeySimilarityOptions['serveMode']
  readonly skipIdenticalKeys: boolean
  readonly wasmPath: string | undefined
}

const toWorkerOptions = (options: ResolvedKeySimilarityOptions): WorkerOptions => ({
  buildMode: options.buildMode,
  cacheDir: options.cacheDir,
  modelIdentifier: options.modelIdentifier,
  modelPath: options.modelPath,
  modelRevision: options.modelRevision,
  root: options.root,
  serveMode: options.serveMode,
  skipIdenticalKeys: options.skipIdenticalKeys,
  wasmPath: options.wasmPath,
})

const WORKER_MODULE_PATH = './worker.mjs'

const createAnalysisWorker = (options: WorkerOptions): AnalysisWorker => {
  const worker = new Worker(new URL(WORKER_MODULE_PATH, import.meta.url), {workerData: options})
  return {
    onError(listener) {
      worker.on('error', listener)
    },
    onMessage(listener) {
      worker.on('message', listener)
    },
    postMessage(job) {
      worker.postMessage(job)
    },
    terminate: () => worker.terminate(),
  }
}

export class KeyAnalysisQueue {
  private readonly callbacks: AnalysisQueueCallbacks
  private closePromise: Promise<void> | undefined
  private readonly core: KeySimilarityCore
  private readonly diagnosticsByPair = new Map<string, SimilarityDiagnostic>()
  private failure: Error | undefined
  private identifier = 0
  private initialization: Promise<unknown> | undefined
  private readonly idleResolvers = new Set<() => void>()
  private pendingCount = 0
  private processing = Promise.resolve()
  private readonly revisions = new Map<string, number>()
  private readonly sources = new Map<string, string>()
  private readonly worker: AnalysisWorker | undefined

  constructor(
    core: KeySimilarityCore,
    options: ResolvedKeySimilarityOptions,
    callbacks: AnalysisQueueCallbacks = {},
    dependencies: AnalysisQueueDependencies = {},
  ) {
    this.callbacks = callbacks
    this.core = core
    if (options.__embeddingProvider === undefined) {
      this.worker = (dependencies.createWorker ?? createAnalysisWorker)(toWorkerOptions(options))
      this.worker.onMessage((message) => {
        if ('error' in message) {
          this.finishFailure(message.identifier, new Error(message.error))
        } else {
          this.finishResult(message)
        }
      })
      this.worker.onError((error) => this.failAll(error))
    }
  }

  get diagnostics(): ReadonlyArray<SimilarityDiagnostic> {
    return [...this.diagnosticsByPair.values()].sort(
      (left, right) =>
        left.left.filePath.localeCompare(right.left.filePath) ||
        left.left.literalStart - right.left.literalStart ||
        left.right.filePath.localeCompare(right.right.filePath) ||
        left.right.literalStart - right.right.literalStart,
    )
  }

  enqueue(filePath: string, code: string): void {
    if (this.sources.get(filePath) === code) {
      return
    }
    this.sources.set(filePath, code)
    const revision = (this.revisions.get(filePath) ?? 0) + 1
    this.revisions.set(filePath, revision)
    const job: AnalysisJob = {
      extraction: this.core.extractModule(code, filePath),
      filePath,
      identifier: this.identifier,
      revision,
    }
    this.identifier += 1
    this.pendingCount += 1
    if (this.worker) {
      this.worker.postMessage(job)
    } else {
      this.enqueueInline(job)
    }
  }

  remove(filePath: string): void {
    const revision = (this.revisions.get(filePath) ?? 0) + 1
    this.revisions.set(filePath, revision)
    this.sources.delete(filePath)
    this.removeDiagnosticsForFile(filePath)
    const job: AnalysisJob = {
      extraction: {dynamicCalls: [], entries: []},
      filePath,
      identifier: this.identifier,
      revision,
    }
    this.identifier += 1
    this.pendingCount += 1
    if (this.worker) {
      this.worker.postMessage(job)
    } else {
      this.enqueueInline(job)
    }
  }

  async drain(): Promise<void> {
    if (this.pendingCount > 0) {
      await new Promise<void>((resolve) => {
        this.idleResolvers.add(resolve)
      })
    }
    if (this.failure) {
      throw this.failure
    }
  }

  close(): Promise<void> {
    this.closePromise ??= this.closeOnce()
    return this.closePromise
  }

  private async closeOnce(): Promise<void> {
    try {
      await this.drain()
    } finally {
      await this.worker?.terminate()
    }
  }

  private enqueueInline(job: AnalysisJob): void {
    this.processing = this.processing.then(async () => {
      try {
        this.initialization ??= this.core.initializeForVite()
        await this.initialization
        const diagnostics = await this.core.updateExtraction(job.filePath, job.extraction)
        this.finishResult({
          diagnostics,
          filePath: job.filePath,
          identifier: job.identifier,
          revision: job.revision,
        })
      } catch (error: unknown) {
        this.finishFailure(
          job.identifier,
          error instanceof Error ? error : new Error(String(error)),
        )
      }
    })
  }

  private finishResult(result: AnalysisResult): void {
    if (this.revisions.get(result.filePath) === result.revision) {
      this.removeDiagnosticsForFile(result.filePath)
      for (const diagnostic of result.diagnostics) {
        this.diagnosticsByPair.set(this.getPairIdentifier(diagnostic), diagnostic)
      }
      this.callbacks.onResult?.(result)
    }
    this.finishPending()
  }

  private finishFailure(_identifier: number, error: Error): void {
    this.fail(error)
    this.finishPending()
  }

  private fail(error: Error): void {
    this.failure ??= error
    this.callbacks.onError?.(error)
  }

  private failAll(error: Error): void {
    this.fail(error)
    this.pendingCount = 0
    for (const resolve of this.idleResolvers) {
      resolve()
    }
    this.idleResolvers.clear()
  }

  private finishPending(): void {
    this.pendingCount -= 1
    if (this.pendingCount === 0) {
      for (const resolve of this.idleResolvers) {
        resolve()
      }
      this.idleResolvers.clear()
    }
  }

  private getPairIdentifier(diagnostic: SimilarityDiagnostic): string {
    const left = `${diagnostic.left.filePath}:${diagnostic.left.literalStart}`
    const right = `${diagnostic.right.filePath}:${diagnostic.right.literalStart}`
    return `${left}\0${right}`
  }

  private removeDiagnosticsForFile(filePath: string): void {
    for (const [identifier, diagnostic] of this.diagnosticsByPair) {
      if (diagnostic.left.filePath === filePath || diagnostic.right.filePath === filePath) {
        this.diagnosticsByPair.delete(identifier)
      }
    }
  }
}
