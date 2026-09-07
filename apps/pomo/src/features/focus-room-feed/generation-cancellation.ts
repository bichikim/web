import type {SupertonicClient} from '../supertonic'
import type {FeedDialogueRepository} from './feed-dialogue-repository'
import type {FeedDialogueJob} from './feed-dialogue-schema'
import type {ScheduledFeedJob} from './generation-queue'

interface CancelFeedProcessingBaseOptions {
  readonly abortController: AbortController
  readonly client: SupertonicClient | null
  readonly isDisposed: () => boolean
  readonly onRecovery: (jobs: ReadonlyArray<FeedDialogueJob>) => void
  readonly repository: Pick<FeedDialogueRepository, 'interruptUnfinishedJobs'>
  readonly scheduledJobs: Array<ScheduledFeedJob>
  readonly updatedAt: string
}

interface CancelFeedProcessingWithDismissedIds extends CancelFeedProcessingBaseOptions {
  readonly dismissedRecoveryIds: ReadonlySet<string>
}

interface CancelFeedProcessingWithDismissedPredicate extends CancelFeedProcessingBaseOptions {
  readonly isRecoveryDismissed: (jobId: string) => boolean
}

export type CancelFeedProcessingOptions =
  | CancelFeedProcessingWithDismissedIds
  | CancelFeedProcessingWithDismissedPredicate

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

  const isRecoveryDismissed =
    'isRecoveryDismissed' in options
      ? options.isRecoveryDismissed
      : (jobId: string) => options.dismissedRecoveryIds.has(jobId)

  options.onRecovery(
    jobs.filter(
      (job) =>
        (job.status === 'failed' || job.status === 'interrupted') && !isRecoveryDismissed(job.id),
    ),
  )
}
