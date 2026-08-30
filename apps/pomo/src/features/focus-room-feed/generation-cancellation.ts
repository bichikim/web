import type {SupertonicClient} from '../supertonic'
import type {FeedDialogueRepository} from './feed-dialogue-repository'
import type {FeedDialogueJob} from './feed-dialogue-schema'
import type {ScheduledFeedJob} from './generation-queue'

export interface CancelFeedProcessingOptions {
  readonly abortController: AbortController
  readonly client: SupertonicClient | null
  readonly dismissedRecoveryIds: ReadonlySet<string>
  readonly isDisposed: () => boolean
  readonly onRecovery: (jobs: ReadonlyArray<FeedDialogueJob>) => void
  readonly repository: Pick<FeedDialogueRepository, 'interruptUnfinishedJobs'>
  readonly scheduledJobs: Array<ScheduledFeedJob>
  readonly updatedAt: string
}

/** Stops active feed work and persists unfinished jobs for a later retry. */
export const cancelFeedProcessing = async (options: CancelFeedProcessingOptions) => {
  options.scheduledJobs.splice(0, options.scheduledJobs.length)
  options.abortController.abort()
  options.client?.cancelGeneration()
  options.client?.dispose()

  const jobs = await options.repository.interruptUnfinishedJobs(options.updatedAt)

  if (options.isDisposed()) {
    return
  }

  options.onRecovery(
    jobs.filter(
      (job) =>
        (job.status === 'failed' || job.status === 'interrupted') &&
        !options.dismissedRecoveryIds.has(job.id),
    ),
  )
}
