import type {FeedDialogueJob} from './feed-dialogue-schema'

export interface ScheduledFeedJob {
  readonly allowModelDownload: boolean
  readonly id: string
}

interface ProcessScheduledFeedJobOptions {
  readonly generate: (job: FeedDialogueJob, allowModelDownload: boolean) => Promise<void>
  readonly handleFailure: (job: FeedDialogueJob, error: unknown) => Promise<void>
  readonly listJobs: () => Promise<ReadonlyArray<FeedDialogueJob>>
  readonly scheduledJob: ScheduledFeedJob
}

export const processScheduledFeedJob = async (options: ProcessScheduledFeedJobOptions) => {
  const jobs = await options.listJobs()
  const job = jobs.find((item) => item.id === options.scheduledJob.id && item.status === 'queued')

  if (job === undefined) {
    return
  }

  try {
    await options.generate(job, options.scheduledJob.allowModelDownload)
  } catch (error: unknown) {
    await options.handleFailure(job, error)
  }
}

export const scheduleFeedJobs = (
  queue: Array<ScheduledFeedJob>,
  jobIds: ReadonlyArray<string>,
  run: () => Promise<void>,
  allowModelDownload = false,
) => {
  for (const jobId of jobIds) {
    const scheduledIndex = queue.findIndex((job) => job.id === jobId)

    if (scheduledIndex === -1) {
      queue.push({allowModelDownload, id: jobId})
    } else if (allowModelDownload && !queue[scheduledIndex]?.allowModelDownload) {
      queue[scheduledIndex] = {allowModelDownload: true, id: jobId}
    }
  }

  if (jobIds.length > 0) {
    run().catch((error: unknown) => {
      console.error('Unexpected feed generation queue failure.', error)
    })
  }
}
