import {parentPort, workerData} from 'node:worker_threads'
import {KeySimilarityCore} from './core'
import type {AnalysisFailure, AnalysisJob, AnalysisResult, WorkerOptions} from './queue'
import {DEFAULT_SEMANTIC_THRESHOLD, type ResolvedKeySimilarityOptions} from './types'

const port = parentPort
if (!port) {
  throw new Error('The key similarity worker requires a parent port.')
}

const sourceOptions = workerData as WorkerOptions
const options: ResolvedKeySimilarityOptions = {
  ...sourceOptions,
  __embeddingProvider: undefined,
  exclude: [],
  keyDetector: () => undefined,
  scanInclude: [],
  semanticThreshold: DEFAULT_SEMANTIC_THRESHOLD,
}
const core = new KeySimilarityCore(options)
const initialization = core.initializeForVite()
let processing = Promise.resolve()

port.on('message', (job: AnalysisJob) => {
  processing = processing.then(async () => {
    try {
      await initialization
      const diagnostics = await core.updateExtraction(job.filePath, job.extraction)
      const result: AnalysisResult = {
        diagnostics,
        filePath: job.filePath,
        identifier: job.identifier,
        revision: job.revision,
      }
      port.postMessage(result)
    } catch (error: unknown) {
      const failure: AnalysisFailure = {
        error: error instanceof Error ? (error.stack ?? error.message) : String(error),
        identifier: job.identifier,
      }
      port.postMessage(failure)
    }
  })
})
