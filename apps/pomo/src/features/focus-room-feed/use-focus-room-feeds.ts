// oxlint-disable no-await-in-loop -- Feed orchestration owns one model Worker and its persisted lifecycle.
import {createMemo, createSignal, onCleanup, onMount} from 'solid-js'
import {useEvent} from '@winter-love/solid-use/event'

import type {GenerateCompressedDialogueAudioResult} from '../focus-room-dialogue/generate-dialogue-audio'
import {
  createPDialogueRepository,
  type PDialogueRepository,
} from '../focus-room-dialogue/repository'
import type {PDialogue} from '../focus-room-dialogue/schema'
import type {SupertonicClient} from '../supertonic/client'
import type {SupertonicModelId} from '../supertonic/model'
import {
  FEED_DIALOGUE_EXPIRATION_MS,
  type FeedDialogueJob,
  type FeedDialogueMetadata,
  type FeedItemRecord,
  getFeedItemRecordId,
} from './feed-dialogue-schema'
import {createFeedDialogueRepository, type FeedDialogueRepository} from './feed-dialogue-repository'
import {repairStoredDevFeedDialogues} from './feed-dialogue-repair'
import {feedGenerationRuntime} from './generation-runtime'
import {prepareFeedGeneration} from './generation-preparation'
import {resolveCurrentGenerationSettings} from './generation-settings-runtime'
import {createFeedConnectionRepository} from './repository'
import {beginFeedSync, createFeedSyncGate, finishFeedSync} from './sync-gate'
import {synchronizeFeeds} from './feed-sync'
import {
  type FeedDialogueListItem,
  findFeedNotificationDialogue,
  type PFeedController,
  type PFeedState,
  type UsePFeedsProps,
} from './feed-controller'
import {
  deleteExpiredFeedDialogues,
  discardFeedJobs,
  loadFeedDialogueList,
  loadFeedIssues,
} from './feed-dialogue-lifecycle'
import {
  createFeedFetcher,
  FEED_POLLING_INTERVAL_MS,
  getFeedGenerationProgress,
} from './feed-runtime'
import {processScheduledFeedJob, type ScheduledFeedJob, scheduleFeedJobs} from './generation-queue'
import {FEED_CONNECTIONS_CHANGED_EVENT} from './use-feed-connections'

// oxlint-disable-next-line eslint/max-lines-per-function -- One hook owns a single disposable feed synchronization and model lifecycle.
export const usePFeeds = (props: UsePFeedsProps): PFeedController => {
  const [dialogues, setDialogues] = createSignal<ReadonlyArray<FeedDialogueListItem>>([])
  const unlistenedDialogues = createMemo(() =>
    dialogues().filter((item) => item.metadata.listenedAt === null),
  )
  const latestReady = createMemo(() => findFeedNotificationDialogue(unlistenedDialogues()))
  const [isListening, setIsListening] = createSignal(false)
  const [issues, setIssues] = createSignal<ReadonlyArray<FeedItemRecord>>([])
  const [recoveryJobs, setRecoveryJobs] = createSignal<ReadonlyArray<FeedDialogueJob>>([])
  const [state, setState] = createSignal<PFeedState>({
    message: '구독 피드를 기다리고 있어요.',
    status: 'idle',
  })
  let dialogueRepository: PDialogueRepository | null = null
  let feedRepository: FeedDialogueRepository | null = null
  let client: SupertonicClient | null = null
  let isDisposed = false
  const opusAbortController = new AbortController()
  let isGenerating = false
  const syncGate = createFeedSyncGate()
  let preparedModelId: SupertonicModelId | null = null
  const scheduledJobs: Array<ScheduledFeedJob> = []
  const dismissedRecoveryIds = new Set<string>()
  const setFeedState = (nextState: PFeedState) => {
    if (!isDisposed) {
      setState(nextState)
    }
  }
  const getRepositories = () => {
    if (dialogueRepository === null || feedRepository === null) {
      throw new Error('피드 대화 저장소가 아직 준비되지 않았어요.')
    }

    return {dialogueRepository, feedRepository}
  }
  const reloadDialogues = async () => {
    const repositories = getRepositories()
    const available = await loadFeedDialogueList(repositories)

    if (isDisposed) {
      return
    }

    setDialogues(available)
  }
  const reloadRecovery = async () => {
    const jobs = await getRepositories().feedRepository.listJobs()

    if (!isDisposed) {
      setRecoveryJobs(
        jobs.filter(
          (job) =>
            (job.status === 'failed' || job.status === 'interrupted') &&
            !dismissedRecoveryIds.has(job.id),
        ),
      )
    }
  }
  const reloadIssues = async () => {
    const connections = createFeedConnectionRepository(window.localStorage).list()
    const nextIssues = await loadFeedIssues({
      connectionIds: connections.map((connection) => connection.id),
      feedRepository: getRepositories().feedRepository,
    })

    if (!isDisposed) {
      setIssues(nextIssues)
    }
  }
  const markDialoguesListened = async (dialogueIds: ReadonlyArray<string>) => {
    const pendingIds = new Set(dialogueIds)
    const pendingItems = dialogues().filter(
      (item) => pendingIds.has(item.metadata.dialogueId) && item.metadata.listenedAt === null,
    )

    if (pendingItems.length === 0) {
      return
    }

    const listenedAt = new Date().toISOString()
    const repository = getRepositories().feedRepository
    const storedIds = new Set(pendingItems.map((item) => item.metadata.dialogueId))
    await Promise.all(
      pendingItems.map((item) => repository.markListened(item.metadata.dialogueId, listenedAt)),
    )
    setDialogues((items) =>
      items.map((item) =>
        storedIds.has(item.metadata.dialogueId)
          ? {...item, metadata: {...item.metadata, listenedAt}}
          : item,
      ),
    )
  }
  const markListened = (dialogueId: string) => markDialoguesListened([dialogueId])
  const repairMalformedDevDialogues = async () => {
    const repositories = getRepositories()
    const connections = createFeedConnectionRepository(window.localStorage).list()
    const repairedCount = await repairStoredDevFeedDialogues({...repositories, connections})

    if (repairedCount > 0) {
      await props.events.refreshDialogues()
    }
  }
  const cleanupExpiredDialogues = async (now: Date) => {
    const repositories = getRepositories()
    const deletedCount = await deleteExpiredFeedDialogues({
      ...repositories,
      isDialogueScheduled: props.events.isDialogueScheduled,
      now,
    })

    if (deletedCount > 0) {
      await Promise.all([reloadDialogues(), props.events.refreshDialogues()])
    }
  }
  const discardUnsubscribedJob = async (job: FeedDialogueJob) => {
    const connections = createFeedConnectionRepository(window.localStorage).list()

    if (connections.some((connection) => connection.id === job.feedConnectionId)) {
      return false
    }

    await getRepositories().feedRepository.deleteJobs([job.id], new Date().toISOString())
    await reloadRecovery()
    return true
  }
  const discardJobsForMissingConnections = async (
    connectionIds: ReadonlySet<string>,
    updatedAt: string,
  ) => {
    const repository = getRepositories().feedRepository
    const jobIds = await discardFeedJobs({connectionIds, feedRepository: repository, updatedAt})

    if (jobIds.length === 0) {
      return
    }

    const discardedIds = new Set(jobIds)
    const remainingJobs = scheduledJobs.filter((job) => !discardedIds.has(job.id))
    scheduledJobs.splice(0, scheduledJobs.length, ...remainingJobs)
    await reloadRecovery()
  }
  const prepareModel = async (modelId: SupertonicModelId) => {
    if (client !== null && preparedModelId === modelId) {
      return true
    }

    client?.dispose()
    const nextClient = await feedGenerationRuntime.createVoiceClient()
    client = nextClient
    preparedModelId = null
    setFeedState({message: '피드 음성 모델을 확인하고 있어요.', progress: 0, status: 'preparing'})
    const result = await nextClient.initialize({
      modelId,
      onProgress: (progress) => {
        if (client === nextClient && !isDisposed) {
          setFeedState({
            message: `${progress.fileName} 준비 중…`,
            progress: getFeedGenerationProgress(progress.loadedBytes, progress.totalBytes),
            status: 'preparing',
          })
        }
      },
      onStatus: (message) => {
        if (client === nextClient && !isDisposed) {
          const currentState = state()
          setFeedState({
            message,
            progress: currentState.status === 'preparing' ? currentState.progress : null,
            status: 'preparing',
          })
        }
      },
    })

    if (!result.ok || client !== nextClient || isDisposed) {
      nextClient.dispose()

      if (client === nextClient) {
        client = null
      }

      return false
    }

    preparedModelId = modelId
    return true
  }
  const findItem = async (job: FeedDialogueJob) => {
    const items = await getRepositories().feedRepository.listItems(job.feedConnectionId)
    return items.find((item) => item.feedItemId === job.feedItemId) ?? null
  }
  const failJob = async (job: FeedDialogueJob, message: string) => {
    const repositories = getRepositories()
    const now = new Date().toISOString()
    const storedItem = await findItem(job)
    const failedJob = {...job, errorMessage: message, status: 'failed' as const, updatedAt: now}
    const failedItem =
      storedItem === null
        ? undefined
        : {...storedItem, message, status: 'failed' as const, updatedAt: now}
    await repositories.feedRepository.updateJob(failedJob, failedItem)
    await Promise.all([reloadRecovery(), reloadIssues()])
  }
  const completeJob = async (
    job: FeedDialogueJob,
    generated: Extract<GenerateCompressedDialogueAudioResult, {readonly ok: true}>,
  ) => {
    const repositories = getRepositories()
    const storedItem = await findItem(job)

    if (storedItem === null) {
      throw new Error('생성할 피드 항목 기록을 찾지 못했어요.')
    }

    const now = new Date()
    const nowIso = now.toISOString()
    const dialogueId = crypto.randomUUID()
    const dialogue = {
      audioKey: crypto.randomUUID(),
      createdAt: nowIso,
      durationMs: generated.value.durationMs,
      id: dialogueId,
      language: 'ko',
      modelId: job.modelId,
      segments: generated.value.segments,
      text: job.script,
      updatedAt: nowIso,
      version: 1,
      voiceId: job.voiceId,
    } satisfies PDialogue
    const metadata = {
      createdAt: nowIso,
      dialogueId,
      expiresAt: new Date(now.getTime() + FEED_DIALOGUE_EXPIRATION_MS).toISOString(),
      feedConnectionId: job.feedConnectionId,
      feedItemId: job.feedItemId,
      itemTitle: job.itemTitle,
      listenedAt: null,
      publishedAt: job.publishedAt,
      sourceTitle: job.sourceTitle,
      sourceUrl: job.sourceUrl,
      version: 1,
    } satisfies FeedDialogueMetadata
    const readyItem = {
      ...storedItem,
      message: null,
      status: 'ready',
      updatedAt: nowIso,
    } satisfies FeedItemRecord

    await repositories.dialogueRepository.saveDialogue({audio: generated.value.audio, dialogue})

    try {
      await repositories.feedRepository.complete({item: readyItem, jobId: job.id, metadata})
    } catch (error: unknown) {
      await repositories.dialogueRepository.deleteDialogue(dialogueId)
      throw error
    }

    await Promise.all([reloadDialogues(), reloadIssues(), props.events.refreshDialogues()])
  }
  const generateJob = async (job: FeedDialogueJob, allowModelDownload: boolean) => {
    if (await discardUnsubscribedJob(job)) {
      return
    }

    const preparation = await prepareFeedGeneration({
      allowModelDownload,
      isModelDownloaded: feedGenerationRuntime.isModelDownloaded,
      job,
      now: () => new Date().toISOString(),
      prepareModel,
      repository: getRepositories().feedRepository,
      resolveGenerationSettings: resolveCurrentGenerationSettings,
    })
    switch (preparation.status) {
      case 'connection-missing':
        await discardUnsubscribedJob(job)
        return
      case 'model-download-required':
        await failJob(preparation.job, '음성 모델 다운로드에 동의한 뒤 다시 시도해 주세요.')
        return
      case 'model-preparation-failed':
        await failJob(preparation.job, '피드 음성 모델을 준비하지 못했어요.')
        return
      case 'ready':
        break
    }

    const currentJob = preparation.job
    if (client === null) {
      await failJob(currentJob, '피드 음성 모델을 준비하지 못했어요.')
      return
    }

    const currentClient = client
    setFeedState({
      message: `${currentJob.itemTitle} 음성을 만들고 있어요.`,
      progress: null,
      status: 'generating',
    })
    const generated = await feedGenerationRuntime.generateDialogueAudio({
      client: currentClient,
      language: 'ko',
      modelId: currentJob.modelId,
      onChunk: (completed, total) => {
        if (client === currentClient && !isDisposed) {
          setFeedState({
            message: `${currentJob.itemTitle} · ${completed}/${total} 구간 생성 중`,
            progress: getFeedGenerationProgress(completed, total),
            status: 'generating',
          })
        }
      },
      signal: opusAbortController.signal,
      text: currentJob.script,
      voiceId: currentJob.voiceId,
    })

    if (isDisposed || client !== currentClient || (await discardUnsubscribedJob(currentJob))) {
      return
    }

    if (!generated.ok) {
      await failJob(currentJob, generated.message)
      return
    }

    await completeJob(currentJob, generated)
  }
  const handleJobFailure = async (job: FeedDialogueJob, error: unknown) => {
    console.error('Failed to process feed dialogue job.', error)

    if (isDisposed || (await discardUnsubscribedJob(job))) {
      return
    }

    await failJob(job, '피드 대화를 저장하지 못했어요.')
  }
  const runScheduledJobs = async () => {
    if (isGenerating || isDisposed) {
      return
    }

    isGenerating = true

    try {
      while (scheduledJobs.length > 0) {
        if (isDisposed) {
          return
        }

        const scheduledJob = scheduledJobs.shift()

        if (scheduledJob !== undefined) {
          await processScheduledFeedJob({
            generate: generateJob,
            handleFailure: handleJobFailure,
            listJobs: () => getRepositories().feedRepository.listJobs(),
            scheduledJob,
          })
        }
      }
    } finally {
      isGenerating = false

      if (!isDisposed) {
        setFeedState({message: '다음 피드 확인을 기다리고 있어요.', status: 'idle'})
      }
    }
  }
  const scheduleJobs = (jobIds: ReadonlyArray<string>, allowModelDownload = false) => {
    scheduleFeedJobs(scheduledJobs, jobIds, runScheduledJobs, allowModelDownload)
  }
  const syncNow = async () => {
    if (isDisposed || !beginFeedSync(syncGate)) {
      return
    }

    const now = new Date()

    try {
      const connectionRepository = createFeedConnectionRepository(window.localStorage)
      const connections = connectionRepository.list()
      await discardJobsForMissingConnections(
        new Set(connections.map((connection) => connection.id)),
        now.toISOString(),
      )
      await cleanupExpiredDialogues(now)
      await reloadIssues()

      if (connections.length === 0) {
        setFeedState({message: '설정에서 구독 피드를 추가해 주세요.', status: 'idle'})
        return
      }

      setFeedState({message: '새 피드를 확인하고 있어요…', progress: null, status: 'syncing'})
      const summary = await synchronizeFeeds({
        connections,
        createId: () => crypto.randomUUID(),
        fetcher: createFeedFetcher(),
        now,
        repository: getRepositories().feedRepository,
        resolveGenerationSettings: resolveCurrentGenerationSettings,
      })

      if (summary.failures.length > 0) {
        setFeedState({
          message: `${summary.failures.length}개 피드를 가져오지 못했어요. 주소나 CORS 설정을 확인해 주세요.`,
          status: 'error',
        })
      } else if (summary.queuedJobIds.length === 0) {
        setFeedState({message: '새 피드가 없어요.', status: 'idle'})
      }

      scheduleJobs(summary.queuedJobIds)
    } catch (error: unknown) {
      console.error('Failed to synchronize focus room feeds.', error)
      setFeedState({message: '피드를 확인하지 못했어요.', status: 'error'})
    } finally {
      if (finishFeedSync(syncGate) && !isDisposed) {
        await syncNow()
      }
    }
  }

  onMount(() => {
    dialogueRepository = createPDialogueRepository()
    feedRepository = createFeedDialogueRepository()
    const initialize = async () => {
      await repairMalformedDevDialogues()
      const jobs = await getRepositories().feedRepository.interruptUnfinishedJobs(
        new Date().toISOString(),
      )
      setRecoveryJobs(jobs.filter((job) => job.status === 'failed' || job.status === 'interrupted'))
      await reloadDialogues()
      await syncNow()
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncNow().catch((error: unknown) => {
          console.error('Failed to refresh visible focus room feeds.', error)
        })
      }
    }
    const handleConnectionChange = () => {
      syncNow().catch((error: unknown) => {
        console.error('Failed to refresh changed focus room feeds.', error)
      })
    }
    const interval = window.setInterval(() => {
      syncNow().catch((error: unknown) => {
        console.error('Failed to poll focus room feeds.', error)
      })
    }, FEED_POLLING_INTERVAL_MS)

    useEvent(document, 'visibilitychange', handleVisibilityChange)
    useEvent(window, FEED_CONNECTIONS_CHANGED_EVENT, handleConnectionChange)
    useEvent(window, feedGenerationRuntime.settingsChangedEvent, handleConnectionChange)
    initialize().catch((error: unknown) => {
      console.error('Failed to initialize focus room feeds.', error)
      setFeedState({message: '피드 기능을 시작하지 못했어요.', status: 'error'})
    })
    onCleanup(() => {
      window.clearInterval(interval)
    })
  })

  onCleanup(() => {
    isDisposed = true
    opusAbortController.abort()
    client?.cancelGeneration()
    client?.dispose()
    dialogueRepository?.dispose()
    feedRepository?.dispose()
  })

  return {
    async deleteRecovery() {
      const jobs = recoveryJobs()
      await getRepositories().feedRepository.deleteJobs(
        jobs.map((job) => job.id),
        new Date().toISOString(),
      )
      setRecoveryJobs([])
    },
    dialogues,
    dismissRecovery() {
      recoveryJobs().forEach((job) => dismissedRecoveryIds.add(job.id))
      setRecoveryJobs([])
    },
    isListening,
    issues,
    latestReady,
    async listen(dialogueId) {
      await markListened(dialogueId)
      await props.events.playDialogue(dialogueId)
    },
    async listenAll() {
      if (isListening()) {
        return
      }

      const dialogueIds = unlistenedDialogues()
        .map((item) => item.dialogue.id)
        .toReversed()

      if (dialogueIds.length === 0) {
        return
      }

      setIsListening(true)

      try {
        await props.events.playDialogueSequence({
          dialogueIds,
          onDialogueStart: markListened,
          // A user stop dismisses the whole feed batch; cancellations and playback failures do not.
          onSequenceStop: markDialoguesListened,
        })
      } finally {
        if (!isDisposed) {
          setIsListening(false)
        }
      }
    },
    async onDeleteDialogue(dialogueId) {
      const repository = getRepositories().feedRepository

      await props.events.deleteDialogue(dialogueId)

      try {
        await repository.removeMetadata(dialogueId)
      } finally {
        await reloadDialogues()
      }
    },
    recoveryJobs,
    async retryRecovery() {
      const jobs = recoveryJobs()
      const jobIds = jobs.map((job) => job.id)
      await getRepositories().feedRepository.retryJobs(jobIds, new Date().toISOString())
      setRecoveryJobs([])
      scheduleJobs(jobIds, true)
    },
    state,
    syncNow,
    unlistenedDialogues,
  }
}
