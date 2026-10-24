import {parentPort, workerData} from 'node:worker_threads'
import {createDefaultRunnerExecutor} from './executor.ts'
import {getRunnerError} from './errors.ts'
import type {RunnerJobRecord} from './types.ts'

const input = workerData as {readonly job: RunnerJobRecord; readonly modelCacheDirectory?: string}
const port = parentPort
if (port === null) {
  throw new Error('Inference requires a worker thread')
}

const executor = createDefaultRunnerExecutor({modelCacheDirectory: input.modelCacheDirectory})
try {
  const result = await executor.execute(input.job, {
    onProgress: (progress) => port.postMessage({progress, type: 'progress'}),
    signal: new AbortController().signal,
  })
  port.postMessage({result, type: 'complete'})
} catch (error) {
  port.postMessage({
    error: getRunnerError(error, 'inference-failed', 'Inference failed'),
    type: 'error',
  })
}
