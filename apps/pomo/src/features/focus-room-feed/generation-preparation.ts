// oxlint-disable no-await-in-loop -- Each model must finish preparing before settings can be checked again.
import type {SupertonicModelId} from '../supertonic'
import type {FeedDialogueRepository} from './feed-dialogue-repository'
import type {FeedDialogueJob} from './feed-dialogue-schema'
import type {FeedGenerationSettings} from './generation-settings'

export interface PrepareFeedGenerationOptions {
  readonly allowModelDownload: boolean
  readonly isModelDownloaded: (modelId: SupertonicModelId) => Promise<boolean>
  readonly job: FeedDialogueJob
  readonly now: () => string
  readonly prepareModel: (modelId: SupertonicModelId) => Promise<boolean>
  readonly repository: Pick<FeedDialogueRepository, 'startJob'>
  readonly resolveGenerationSettings: (
    connectionId: string,
  ) => Promise<FeedGenerationSettings | null>
}

interface MissingConnectionPreparation {
  readonly status: 'connection-missing'
}

interface JobNotQueuedPreparation {
  readonly status: 'job-not-queued'
}

interface ModelDownloadRequiredPreparation {
  readonly job: FeedDialogueJob
  readonly status: 'model-download-required'
}

interface ModelPreparationFailedPreparation {
  readonly job: FeedDialogueJob
  readonly status: 'model-preparation-failed'
}

interface ReadyFeedGeneration {
  readonly job: FeedDialogueJob
  readonly status: 'ready'
}

export type PrepareFeedGenerationResult =
  | JobNotQueuedPreparation
  | MissingConnectionPreparation
  | ModelDownloadRequiredPreparation
  | ModelPreparationFailedPreparation
  | ReadyFeedGeneration

/** Prepares a stable current model and returns the latest voice immediately before generation. */
export const prepareFeedGeneration = async (
  options: PrepareFeedGenerationOptions,
): Promise<PrepareFeedGenerationResult> => {
  const didStart = await options.repository.startJob({
    ...options.job,
    status: 'generating',
    updatedAt: options.now(),
  })

  if (!didStart) {
    return {status: 'job-not-queued'}
  }

  let settings = await options.resolveGenerationSettings(options.job.feedConnectionId)

  while (settings !== null) {
    const job = {...options.job, modelId: settings.modelId, voiceId: settings.voiceId}

    if (!options.allowModelDownload && !(await options.isModelDownloaded(settings.modelId))) {
      return {job, status: 'model-download-required'}
    }

    if (!(await options.prepareModel(settings.modelId))) {
      return {job, status: 'model-preparation-failed'}
    }

    const latestSettings = await options.resolveGenerationSettings(options.job.feedConnectionId)

    if (latestSettings === null) {
      return {status: 'connection-missing'}
    }

    if (latestSettings.modelId === settings.modelId) {
      return {
        job: {
          ...options.job,
          modelId: latestSettings.modelId,
          voiceId: latestSettings.voiceId,
        },
        status: 'ready',
      }
    }

    settings = latestSettings
  }

  return {status: 'connection-missing'}
}
