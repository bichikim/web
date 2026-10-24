import {Worker} from 'node:worker_threads'
import {RunnerExecutionError} from './errors.ts'
import type {RunnerExecutionResult, RunnerExecutor} from './types.ts'

interface WorkerMessage {
  readonly type: 'progress' | 'complete' | 'error'
  readonly progress?: number
  readonly result?: RunnerExecutionResult
  readonly error?: {readonly code: string; readonly message: string}
}

/** Executes each inference in a worker whose termination releases the runner slot. */
export const createWorkerExecutor = (
  options: {readonly modelCacheDirectory?: string} = {},
): RunnerExecutor => ({
  execute: (job, context) =>
    new Promise((resolve, reject) => {
      if (context.signal.aborted) {
        reject(new RunnerExecutionError('cancelled', 'Inference cancelled'))
        return
      }
      const worker = new Worker(new URL('./inference-worker.ts', import.meta.url), {
        execArgv: ['--experimental-strip-types'],
        workerData: {job, modelCacheDirectory: options.modelCacheDirectory},
      })
      let settled = false
      const finish = (result?: RunnerExecutionResult, error?: Error) => {
        if (settled) {
          return
        }
        settled = true
        context.signal.removeEventListener('abort', abort)
        worker.terminate().then(() => {
          if (error !== undefined) {
            reject(error)
          } else if (result === undefined) {
            reject(new Error('Inference worker exited without a result'))
          } else {
            resolve(result)
          }
        }, reject)
      }
      const abort = () =>
        finish(undefined, new RunnerExecutionError('cancelled', 'Inference cancelled'))
      context.signal.addEventListener('abort', abort, {once: true})
      if (context.signal.aborted) {
        abort()
      }
      worker.on('message', (message: WorkerMessage) => {
        if (settled) {
          return
        }
        switch (message.type) {
          case 'progress':
            if (typeof message.progress === 'number') {
              try {
                context.onProgress(message.progress)
              } catch (error) {
                finish(
                  undefined,
                  error instanceof Error ? error : new Error('Progress persistence failed'),
                )
              }
            }
            return
          case 'complete':
            finish(message.result)
            return
          case 'error':
            finish(
              undefined,
              new RunnerExecutionError(
                message.error?.code ?? 'inference-failed',
                message.error?.message ?? 'Inference failed',
              ),
            )
        }
      })
      worker.on('error', (error) => finish(undefined, error))
      worker.on('exit', () => finish())
    }),
})
