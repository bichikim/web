// oxlint-disable no-await-in-loop -- Feed audio jobs share one model Worker and must run sequentially.
import type {GenerateCompressedDialogueAudioResult} from '../focus-room-dialogue/generate-dialogue-audio'
import type {PDialogueRepository} from '../focus-room-dialogue/repository'
import type {SupertonicClient} from '../supertonic/client'
import type {SupertonicModelId} from '../supertonic/model'
import type {PFeedState} from './feed-controller'
import type {FeedDialogueRepository} from './feed-dialogue-repository'
import type {FeedDialogueJob, FeedItemRecord} from './feed-dialogue-schema'
import type {FeedConnection} from './schema'
import {cancelFeedProcessing} from './generation-cancellation'
import {createFeedDialogueCompletion} from './generation-completion'
import {prepareFeedGeneration} from './generation-preparation'
import {processScheduledFeedJob, type ScheduledFeedJob, scheduleFeedJobs} from './generation-queue'
import {feedGenerationRuntime} from './generation-runtime'
import type {FeedGenerationSettings} from './generation-settings'
import {getFeedGenerationProgress} from './feed-runtime'

export interface FeedGenerationRuntime extends Pick<
  typeof feedGenerationRuntime,
  'createVoiceClient' | 'generateDialogueAudio' | 'isModelDownloaded'
> {}

export interface FeedGenerationDialogueRepository extends Pick<
  PDialogueRepository,
  'deleteDialogue' | 'saveDialogue'
> {}

export interface FeedGenerationRepository extends Pick<
  FeedDialogueRepository,
  'complete' | 'deleteJobs' | 'interruptUnfinishedJobs' | 'listItems' | 'listJobs' | 'updateJob'
> {}

export interface CreateFeedGenerationControllerOptions {
  readonly createId: () => string
  readonly dialogueRepository: FeedGenerationDialogueRepository
  readonly feedRepository: FeedGenerationRepository
  readonly getConnections: () => ReadonlyArray<FeedConnection>
  readonly getState: () => PFeedState
  readonly isRecoveryDismissed: (jobId: string) => boolean
  readonly now: () => Date
  readonly onCompleted: () => Promise<void>
  readonly onDiscarded: () => Promise<void>
  readonly onFailed: () => Promise<void>
  readonly onRecovery: (jobs: ReadonlyArray<FeedDialogueJob>) => void
  readonly resolveGenerationSettings: (
    connectionId: string,
  ) => Promise<FeedGenerationSettings | null>
  readonly runtime: FeedGenerationRuntime
  readonly setState: (state: PFeedState) => void
}

export interface ScheduleFeedGenerationOptions {
  readonly allowModelDownload?: boolean
  readonly jobIds: ReadonlyArray<string>
}

export interface FeedGenerationController {
  readonly cancel: () => Promise<void>
  readonly dispose: () => void
  readonly remove: (jobIds: ReadonlySet<string>) => void
  readonly schedule: (options: ScheduleFeedGenerationOptions) => void
}

interface FeedGenerationContext {
  abortController: AbortController
  client: SupertonicClient | null
  isDisposed: boolean
  isGenerating: boolean
  options: CreateFeedGenerationControllerOptions
  preparedModelId: SupertonicModelId | null
  processingRevision: number
  readonly scheduledJobs: Array<ScheduledFeedJob>
}

const isCurrentProcessing = (context: FeedGenerationContext, revision: number) =>
  context.processingRevision === revision && !context.isDisposed

const setGenerationState = (context: FeedGenerationContext, state: PFeedState) => {
  if (!context.isDisposed) {
    context.options.setState(state)
  }
}

const findFeedItem = async (context: FeedGenerationContext, job: FeedDialogueJob) => {
  const items = await context.options.feedRepository.listItems(job.feedConnectionId)
  return items.find((item) => item.feedItemId === job.feedItemId) ?? null
}

const discardUnsubscribedJob = async (context: FeedGenerationContext, job: FeedDialogueJob) => {
  const hasConnection = context.options
    .getConnections()
    .some((connection) => connection.id === job.feedConnectionId)

  if (hasConnection) {
    return false
  }

  await context.options.feedRepository.deleteJobs([job.id], context.options.now().toISOString())
  await context.options.onDiscarded()
  return true
}

const prepareModel = async (context: FeedGenerationContext, modelId: SupertonicModelId) => {
  if (context.client !== null && context.preparedModelId === modelId) {
    return true
  }

  context.client?.dispose()
  const nextClient = await context.options.runtime.createVoiceClient()
  context.client = nextClient
  context.preparedModelId = null
  setGenerationState(context, {
    message: '피드 음성 모델을 확인하고 있어요.',
    progress: 0,
    status: 'preparing',
  })
  const result = await nextClient.initialize({
    modelId,
    onProgress: (progress) => {
      if (context.client === nextClient && !context.isDisposed) {
        setGenerationState(context, {
          message: `${progress.fileName} 준비 중…`,
          progress: getFeedGenerationProgress(progress.loadedBytes, progress.totalBytes),
          status: 'preparing',
        })
      }
    },
    onStatus: (message) => {
      if (context.client === nextClient && !context.isDisposed) {
        const currentState = context.options.getState()
        setGenerationState(context, {
          message,
          progress: currentState.status === 'preparing' ? currentState.progress : null,
          status: 'preparing',
        })
      }
    },
  })

  if (!result.ok || context.client !== nextClient || context.isDisposed) {
    nextClient.dispose()

    if (context.client === nextClient) {
      context.client = null
    }

    return false
  }

  context.preparedModelId = modelId
  return true
}

const failJob = async (context: FeedGenerationContext, job: FeedDialogueJob, message: string) => {
  const updatedAt = context.options.now().toISOString()
  const storedItem = await findFeedItem(context, job)
  const failedJob = {...job, errorMessage: message, status: 'failed' as const, updatedAt}
  const failedItem =
    storedItem === null ? undefined : {...storedItem, message, status: 'failed' as const, updatedAt}
  await context.options.feedRepository.updateJob(failedJob, failedItem)
  await context.options.onFailed()
}

const completeJob = async (
  context: FeedGenerationContext,
  job: FeedDialogueJob,
  generated: Extract<GenerateCompressedDialogueAudioResult, {readonly ok: true}>,
  revision: number,
) => {
  const storedItem = await findFeedItem(context, job)

  if (!isCurrentProcessing(context, revision)) {
    return
  }

  if (storedItem === null) {
    throw new Error('생성할 피드 항목 기록을 찾지 못했어요.')
  }

  const completion = createFeedDialogueCompletion({
    createId: context.options.createId,
    generated,
    job,
    now: context.options.now(),
    storedItem,
  })
  await context.options.dialogueRepository.saveDialogue({
    audio: completion.audio,
    dialogue: completion.dialogue,
  })

  if (!isCurrentProcessing(context, revision)) {
    await context.options.dialogueRepository.deleteDialogue(completion.dialogue.id)
    return
  }

  try {
    await context.options.feedRepository.complete({
      item: completion.readyItem,
      jobId: job.id,
      metadata: completion.metadata,
    })
  } catch (error: unknown) {
    await context.options.dialogueRepository.deleteDialogue(completion.dialogue.id)
    throw error
  }

  await context.options.onCompleted()
}

const generateJob = async (
  context: FeedGenerationContext,
  job: FeedDialogueJob,
  allowModelDownload: boolean,
  revision: number,
) => {
  if (await discardUnsubscribedJob(context, job)) {
    return
  }

  if (!isCurrentProcessing(context, revision)) {
    return
  }

  const preparation = await prepareFeedGeneration({
    allowModelDownload,
    isModelDownloaded: context.options.runtime.isModelDownloaded,
    job,
    now: () => context.options.now().toISOString(),
    prepareModel: (modelId) => prepareModel(context, modelId),
    repository: context.options.feedRepository,
    resolveGenerationSettings: context.options.resolveGenerationSettings,
  })

  if (!isCurrentProcessing(context, revision)) {
    return
  }

  switch (preparation.status) {
    case 'connection-missing':
      await discardUnsubscribedJob(context, job)
      return
    case 'model-download-required':
      await failJob(context, preparation.job, '음성 모델 다운로드에 동의한 뒤 다시 시도해 주세요.')
      return
    case 'model-preparation-failed':
      await failJob(context, preparation.job, '피드 음성 모델을 준비하지 못했어요.')
      return
    case 'ready':
      break
  }

  const currentJob = preparation.job
  const currentClient = context.client

  if (currentClient === null) {
    await failJob(context, currentJob, '피드 음성 모델을 준비하지 못했어요.')
    return
  }

  setGenerationState(context, {
    message: `${currentJob.itemTitle} 음성을 만들고 있어요.`,
    progress: null,
    status: 'generating',
  })
  const generated = await context.options.runtime.generateDialogueAudio({
    client: currentClient,
    language: 'ko',
    modelId: currentJob.modelId,
    onChunk: (completed, total) => {
      if (context.client === currentClient && isCurrentProcessing(context, revision)) {
        setGenerationState(context, {
          message: `${currentJob.itemTitle} · ${completed}/${total} 구간 생성 중`,
          progress: getFeedGenerationProgress(completed, total),
          status: 'generating',
        })
      }
    },
    signal: context.abortController.signal,
    text: currentJob.script,
    voiceId: currentJob.voiceId,
  })

  if (
    !isCurrentProcessing(context, revision) ||
    context.client !== currentClient ||
    (await discardUnsubscribedJob(context, currentJob))
  ) {
    return
  }

  if (!generated.ok) {
    await failJob(context, currentJob, generated.message)
    return
  }

  await completeJob(context, currentJob, generated, revision)
}

const handleJobFailure = async (
  context: FeedGenerationContext,
  job: FeedDialogueJob,
  error: unknown,
  revision: number,
) => {
  console.error('Failed to process feed dialogue job.', error)

  if (!isCurrentProcessing(context, revision) || (await discardUnsubscribedJob(context, job))) {
    return
  }

  await failJob(context, job, '피드 대화를 저장하지 못했어요.')
}

const runScheduledJobs = async (context: FeedGenerationContext) => {
  if (context.isGenerating || context.isDisposed) {
    return
  }

  context.isGenerating = true

  try {
    while (context.scheduledJobs.length > 0) {
      if (context.isDisposed) {
        return
      }

      const scheduledJob = context.scheduledJobs.shift()

      if (scheduledJob !== undefined) {
        const revision = context.processingRevision
        await processScheduledFeedJob({
          generate: (job, allowModelDownload) =>
            generateJob(context, job, allowModelDownload, revision),
          handleFailure: (job, error) => handleJobFailure(context, job, error, revision),
          listJobs: () => context.options.feedRepository.listJobs(),
          scheduledJob,
        })
      }
    }
  } finally {
    context.isGenerating = false

    if (!context.isDisposed) {
      setGenerationState(context, {
        message: '다음 피드 확인을 기다리고 있어요.',
        status: 'idle',
      })
    }
  }
}

export const createFeedGenerationController = (
  options: CreateFeedGenerationControllerOptions,
): FeedGenerationController => {
  const context: FeedGenerationContext = {
    abortController: new AbortController(),
    client: null,
    isDisposed: false,
    isGenerating: false,
    options,
    preparedModelId: null,
    processingRevision: 0,
    scheduledJobs: [],
  }

  return {
    async cancel() {
      context.processingRevision += 1
      const activeAbortController = context.abortController
      context.abortController = new AbortController()
      const activeClient = context.client
      context.client = null
      context.preparedModelId = null
      await cancelFeedProcessing({
        abortController: activeAbortController,
        client: activeClient,
        isDisposed: () => context.isDisposed,
        isRecoveryDismissed: options.isRecoveryDismissed,
        onRecovery: options.onRecovery,
        repository: options.feedRepository,
        scheduledJobs: context.scheduledJobs,
        updatedAt: options.now().toISOString(),
      })
    },
    dispose() {
      context.isDisposed = true
      context.abortController.abort()
      context.client?.cancelGeneration()
      context.client?.dispose()
      context.client = null
    },
    remove(jobIds) {
      const remainingJobs = context.scheduledJobs.filter((job) => !jobIds.has(job.id))
      context.scheduledJobs.splice(0, context.scheduledJobs.length, ...remainingJobs)
    },
    schedule(scheduleOptions) {
      scheduleFeedJobs(
        context.scheduledJobs,
        scheduleOptions.jobIds,
        () => runScheduledJobs(context),
        scheduleOptions.allowModelDownload,
      )
    },
  }
}
