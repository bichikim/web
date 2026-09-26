// oxlint-disable no-void -- Queue work is deliberately scheduled without delaying HTTP responses.
// oxlint-disable no-await-in-loop -- Idle waits must observe each sequential queue pump.
// oxlint-disable max-lines-per-function -- The service is the single lifecycle boundary for one runner slot.

import {
  type AiRunnerJobStatusResponse,
  aiRunnerJobStatusResponseSchema,
  MAXIMUM_ERROR_CODE_LENGTH,
  MAXIMUM_ERROR_MESSAGE_LENGTH,
} from '../ai/runner-contract.ts'
import {getRunnerError} from './errors.ts'
import type {RunnerJobStore} from './store.ts'
import type {
  RunnerArtifactStore,
  RunnerExecutor,
  RunnerJobRecord,
  RunnerMetrics,
  RunnerService,
} from './types.ts'

interface CreateRunnerServiceOptions {
  readonly artifactStore: RunnerArtifactStore
  readonly clock?: () => number
  readonly executor: RunnerExecutor
  readonly jobStore: RunnerJobStore
  readonly timeoutMs: number
}

const MAXIMUM_PROGRESS = 100
const MINIMUM_TIMEOUT_MS = 1

const createMetrics = (job: RunnerJobRecord, now: number): RunnerMetrics => ({
  inferenceMs: job.startedAt === null ? undefined : Math.max(0, now - job.startedAt),
  queueMs: job.startedAt === null ? undefined : Math.max(0, job.startedAt - job.createdAt),
})

const toStatusResponse = (job: RunnerJobRecord): AiRunnerJobStatusResponse =>
  aiRunnerJobStatusResponseSchema.parse({
    // Preserve full stored diagnostics while keeping historical failures readable over the protocol.
    error:
      job.error === null
        ? null
        : {
            code: job.error.code.slice(0, MAXIMUM_ERROR_CODE_LENGTH) || 'inference-failed',
            message: job.error.message.slice(0, MAXIMUM_ERROR_MESSAGE_LENGTH),
          },
    jobId: job.jobId,
    metrics: job.metrics,
    progress: job.progress,
    result: job.result,
    status: job.status,
  })

export const createRunnerService = (options: CreateRunnerServiceOptions): RunnerService => {
  const clock = options.clock ?? Date.now
  const activeControllers = new Map<string, AbortController>()
  let pumpPromise: Promise<void> | null = null
  let closed = false

  const executeJob = async (job: RunnerJobRecord): Promise<void> => {
    const cancelController = new AbortController()
    const timeoutSignal = AbortSignal.timeout(Math.max(MINIMUM_TIMEOUT_MS, options.timeoutMs))
    const signal = AbortSignal.any([cancelController.signal, timeoutSignal])
    activeControllers.set(job.jobId, cancelController)

    try {
      const execution = await options.executor.execute(job, {
        onProgress: (progress) => {
          options.jobStore.updateProgress(job.jobId, Math.min(MAXIMUM_PROGRESS, progress), clock())
        },
        signal,
      })

      if (cancelController.signal.aborted || options.jobStore.get(job.jobId)?.cancelRequested) {
        options.jobStore.finishCancelled(job.jobId, clock())
        return
      }

      if (timeoutSignal.aborted) {
        options.jobStore.finishFailure(
          job.jobId,
          {code: 'timeout', message: 'The AI runner job exceeded its execution timeout'},
          createMetrics(job, clock()),
          clock(),
        )
        return
      }

      const now = clock()
      const metrics = createMetrics(job, now)

      if (execution.kind === 'text') {
        if (execution.text.trim().length === 0) {
          options.jobStore.finishFailure(
            job.jobId,
            {code: 'empty-result', message: 'The model returned an empty text result'},
            metrics,
            now,
          )
          return
        }

        options.jobStore.finishSuccess(job.jobId, {metrics, text: execution.text}, metrics, now)
        return
      }

      const artifactLocation = job.request.artifact

      if (artifactLocation === undefined) {
        options.jobStore.finishFailure(
          job.jobId,
          {
            code: 'artifact-contract',
            message: 'The media job did not provide an artifact location',
          },
          metrics,
          now,
        )
        return
      }

      const storedArtifact = await options.artifactStore.put({
        bytes: execution.bytes,
        contentType: execution.contentType,
        durationMs: execution.durationMs,
        jobId: job.jobId,
        objectKeyPrefix: artifactLocation.objectKeyPrefix,
        signal,
      })

      if (cancelController.signal.aborted || options.jobStore.get(job.jobId)?.cancelRequested) {
        await options.artifactStore.delete(storedArtifact.objectKey)
        options.jobStore.finishCancelled(job.jobId, clock())
        return
      }

      if (timeoutSignal.aborted) {
        await options.artifactStore.delete(storedArtifact.objectKey)
        options.jobStore.finishFailure(
          job.jobId,
          {code: 'timeout', message: 'The AI runner job exceeded its execution timeout'},
          createMetrics(job, clock()),
          clock(),
        )
        return
      }

      options.jobStore.finishSuccess(
        job.jobId,
        {
          artifact: {
            contentType: storedArtifact.contentType,
            durationMs: storedArtifact.durationMs,
            objectKey: storedArtifact.objectKey,
            sizeBytes: storedArtifact.sizeBytes,
          },
          metrics,
        },
        metrics,
        now,
      )
    } catch (error: unknown) {
      const current = options.jobStore.get(job.jobId)

      if (cancelController.signal.aborted || current?.cancelRequested) {
        options.jobStore.finishCancelled(job.jobId, clock())
      } else if (timeoutSignal.aborted) {
        options.jobStore.finishFailure(
          job.jobId,
          {code: 'timeout', message: 'The AI runner job exceeded its execution timeout'},
          createMetrics(job, clock()),
          clock(),
        )
      } else {
        options.jobStore.finishFailure(
          job.jobId,
          getRunnerError(error, 'inference-failed', 'The AI model execution failed'),
          createMetrics(job, clock()),
          clock(),
        )
      }
    } finally {
      activeControllers.delete(job.jobId)
    }
  }

  const pump = (): Promise<void> => {
    if (pumpPromise !== null) {
      return pumpPromise
    }

    let claimed = false
    pumpPromise = (async () => {
      const nextJob = options.jobStore.claimNext()
      if (nextJob !== null) {
        claimed = true
        await executeJob(nextJob)
      }
    })().finally(() => {
      pumpPromise = null
      if (!closed && claimed && options.jobStore.hasQueued()) {
        void pump()
      }
    })

    return pumpPromise
  }

  const service: RunnerService = {
    cancel: (jobId) => {
      const job = options.jobStore.markCancelRequested(jobId, clock())

      if (job === null) {
        return null
      }

      if (job.status === 'running') {
        activeControllers.get(jobId)?.abort(new Error('Runner job cancelled'))
      }

      return toStatusResponse(options.jobStore.get(jobId) ?? job)
    },
    close: async () => {
      closed = true
      for (const controller of activeControllers.values()) {
        controller.abort(new Error('Runner process is shutting down'))
      }
      await pumpPromise
      options.jobStore.close()
    },
    getStatus: (jobId) => {
      const job = options.jobStore.get(jobId)
      return job === null ? null : toStatusResponse(job)
    },
    recover: () => {
      options.jobStore.recoverRunningJobs(clock())
      void pump()
    },
    submit: (request) => {
      if (closed) {
        throw new Error('Runner is shutting down')
      }
      const result = options.jobStore.create(request)
      void pump()
      return {created: result.created, jobId: result.job.jobId}
    },
    waitForIdle: async () => {
      let pending = pumpPromise
      while (pending !== null || options.jobStore.hasQueued()) {
        if (pending === null) {
          pending = pump()
        } else {
          await pending
        }
        pending = pumpPromise
      }
    },
  }

  return service
}
