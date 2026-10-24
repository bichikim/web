import {KeySimilarityCore} from '../core'
import type {AnalysisFailure, AnalysisJob, AnalysisResult, WorkerOptions} from '../queue'
import {DEFAULT_SEMANTIC_THRESHOLD, type ResolvedKeySimilarityOptions} from '../types'

type ErrorListener = (error: Error) => void
type MessageListener = (message: AnalysisFailure | AnalysisResult) => void

interface TestWorkerOptions {
  readonly workerData: WorkerOptions
}

export class TestWorker {
  readonly #core: KeySimilarityCore
  readonly #initialization: Promise<unknown>
  #errorListener: ErrorListener = () => undefined
  #messageListener: MessageListener = () => undefined
  #processing = Promise.resolve()

  constructor(_file: URL, options: TestWorkerOptions) {
    const sourceOptions = options.workerData
    const resolvedOptions: ResolvedKeySimilarityOptions = {
      ...sourceOptions,
      exclude: [],
      keyDetector: () => undefined,
      scanInclude: [],
      semanticThreshold: DEFAULT_SEMANTIC_THRESHOLD,
    }
    this.#core = new KeySimilarityCore(resolvedOptions)
    this.#initialization = this.#core.initializeForVite()
  }

  on(event: 'error', listener: ErrorListener): this
  on(event: 'message', listener: MessageListener): this
  on(event: 'error' | 'message', listener: ErrorListener | MessageListener): this {
    if (event === 'error') {
      this.#errorListener = listener as ErrorListener
    } else {
      this.#messageListener = listener as MessageListener
    }
    return this
  }

  postMessage(job: AnalysisJob): void {
    this.#processing = this.#processing.then(async () => {
      try {
        await this.#initialization
        const diagnostics = await this.#core.updateExtraction(job.filePath, job.extraction)
        this.#messageListener({
          diagnostics,
          filePath: job.filePath,
          identifier: job.identifier,
          revision: job.revision,
        })
      } catch (error: unknown) {
        this.#errorListener(error instanceof Error ? error : new Error(String(error)))
      }
    })
  }

  async terminate(): Promise<number> {
    await this.#processing
    return 0
  }
}
