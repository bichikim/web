import {batch, createMemo, createSignal} from 'solid-js'
import type {
  ModelDownloadClient,
  ModelDownloadItem,
  ModelDownloadResult,
  ModelDownloadState,
  ModelDownloadTarget,
  StartModelDownloadOptions,
} from './controller'

interface DownloadJob {
  readonly options: StartModelDownloadOptions
  readonly promise: Promise<ModelDownloadResult>
  readonly resolve: (result: ModelDownloadResult) => void
  client: ModelDownloadClient | null
}

const sameTarget = (left: ModelDownloadTarget, right: ModelDownloadTarget) =>
  left.kind === right.kind && left.modelId === right.modelId
const NOOP_RESOLVER = () => undefined
const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : '모델 파일을 내려받지 못했어요.'

/** Queues model preparations in request order and joins requests for the same model. */
export const createDownloadQueue = () => {
  const [downloads, setDownloads] = createSignal<ReadonlyArray<ModelDownloadItem>>([])
  const jobs: Array<DownloadJob> = []
  let active: DownloadJob | null = null
  let disposed = false
  const state = createMemo<ModelDownloadState>(() => {
    const items = downloads()
    return (
      items.find((item) => item.status === 'loading') ??
      items.find((item) => item.status === 'error') ?? {status: 'idle'}
    )
  })
  const update = (job: DownloadJob, item?: ModelDownloadItem) => {
    setDownloads((items) => {
      if (item === undefined) {
        return items.filter((current) => !sameTarget(current.target, job.options.target))
      }
      const present = items.some((current) => sameTarget(current.target, job.options.target))
      return present
        ? items.map((current) => (sameTarget(current.target, job.options.target) ? item : current))
        : [...items, item]
    })
  }
  const finish = (job: DownloadJob, result: ModelDownloadResult) => {
    const index = jobs.indexOf(job)
    if (index < 0) {
      return
    }
    jobs.splice(index, 1)
    if (active === job) {
      active = null
    }
    job.client?.dispose()
    job.resolve(result)
    batch(() => {
      update(
        job,
        result.status === 'error'
          ? {
              label: job.options.label,
              message: result.message,
              status: 'error',
              target: job.options.target,
            }
          : undefined,
      )
      pump()
    })
  }
  const pump = () => {
    if (active !== null || disposed) {
      return
    }
    const [job] = jobs
    if (job === undefined) {
      return
    }
    active = job
    update(job, {
      label: job.options.label,
      percentage: 0,
      status: 'loading',
      target: job.options.target,
    })
    if (active !== job) {
      return
    }
    try {
      const client = job.options.createClient({
        onError: (message) => {
          if (active === job) {
            finish(job, {message, status: 'error'})
          }
        },
        onProgress: (percentage) => {
          if (active === job) {
            update(job, {
              label: job.options.label,
              percentage,
              status: 'loading',
              target: job.options.target,
            })
          }
        },
        onReady: () => {
          if (active === job) {
            finish(job, {status: 'complete'})
          }
        },
      })
      job.client = client
      if (active !== job) {
        client.dispose()
        return
      }
      client.prepare()
    } catch (error) {
      finish(job, {message: errorMessage(error), status: 'error'})
    }
  }
  const start = (options: StartModelDownloadOptions) => {
    if (disposed) {
      return Promise.resolve<ModelDownloadResult>({status: 'cancelled'})
    }
    const existing = jobs.find((job) => sameTarget(job.options.target, options.target))
    if (existing !== undefined) {
      return existing.promise
    }
    let resolveDownload: (result: ModelDownloadResult) => void = NOOP_RESOLVER
    const promise = new Promise<ModelDownloadResult>((resolve) => {
      resolveDownload = resolve
    })
    const job: DownloadJob = {client: null, options, promise, resolve: resolveDownload}
    jobs.push(job)
    batch(() => {
      update(job, {label: options.label, status: 'queued', target: options.target})
      pump()
    })
    return promise
  }
  const cancel = (target?: ModelDownloadTarget) => {
    const job =
      target === undefined ? active : jobs.find((item) => sameTarget(item.options.target, target))
    if (job !== null && job !== undefined) {
      finish(job, {status: 'cancelled'})
    }
  }
  const dismissError = (target?: ModelDownloadTarget) =>
    setDownloads((items) =>
      items.filter(
        (item) =>
          item.status !== 'error' || (target !== undefined && !sameTarget(item.target, target)),
      ),
    )
  const dispose = () => {
    disposed = true
    batch(() => {
      const pending = jobs.slice()
      for (const job of pending) {
        finish(job, {status: 'cancelled'})
      }
      setDownloads([])
    })
  }
  return {cancel, dismissError, dispose, downloads, start, state}
}
