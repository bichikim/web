// oxlint-disable no-await-in-loop -- Feed orchestration owns one model Worker and its persisted lifecycle.
import {createMemo, createSignal, onCleanup, onMount} from 'solid-js'

import {type FocusRoomDialogue, generateDialogueAudio} from '../focus-room-dialogue'
import {
  createFocusRoomDialogueRepository,
  type FocusRoomDialogueRepository,
} from '../focus-room-dialogue/repository'
import {createSupertonicClient, type SupertonicClient, type SupertonicModelId} from '../supertonic'
import {
  FEED_DIALOGUE_EXPIRATION_MS,
  type FeedDialogueJob,
  type FeedDialogueMetadata,
  type FeedItemRecord,
  getFeedItemRecordId,
} from './feed-dialogue-schema'
import {createFeedDialogueRepository, type FeedDialogueRepository} from './feed-dialogue-repository'
import {isLegacyDevFeedFailure, isMalformedDevFeedDialogue} from './feed-dialogue-repair'
import {createFeedConnectionRepository} from './repository'
import {synchronizeFeeds} from './feed-sync'
import {
  type FeedDialogueListItem,
  findFeedNotificationDialogue,
  type FocusRoomFeedController,
  type FocusRoomFeedState,
  type UseFocusRoomFeedsProps,
} from './feed-controller'
import {
  createFeedFetcher,
  DEFAULT_FEED_MODEL_ID,
  FEED_POLLING_INTERVAL_MS,
  findRemovableExpiredDialogues,
  getFeedGenerationProgress,
} from './feed-runtime'
import {FEED_CONNECTIONS_CHANGED_EVENT} from './use-feed-connections'

const MAXIMUM_PROGRESS = 100

/** Owns live feed polling, durable recovery, speech generation, and expiry cleanup. */
// oxlint-disable-next-line eslint/max-lines-per-function -- One hook owns a single disposable feed synchronization and model lifecycle.
export const useFocusRoomFeeds = (props: UseFocusRoomFeedsProps): FocusRoomFeedController => {
  const [dialogues, setDialogues] = createSignal<ReadonlyArray<FeedDialogueListItem>>([])
  const unlistenedDialogues = createMemo(() =>
    dialogues().filter((item) => item.metadata.listenedAt === null),
  )
  const latestReady = createMemo(() => findFeedNotificationDialogue(unlistenedDialogues()))
  const [isListening, setIsListening] = createSignal(false)
  const [issues, setIssues] = createSignal<ReadonlyArray<FeedItemRecord>>([])
  const [recoveryJobs, setRecoveryJobs] = createSignal<ReadonlyArray<FeedDialogueJob>>([])
  const [state, setState] = createSignal<FocusRoomFeedState>({
    message: '구독 피드를 기다리고 있어요.',
    status: 'idle',
  })
  let dialogueRepository: FocusRoomDialogueRepository | null = null
  let feedRepository: FeedDialogueRepository | null = null
  let client: SupertonicClient | null = null
  let isDisposed = false
  let isGenerating = false
  let isSyncing = false
  let preparedModelId: SupertonicModelId | null = null
  const scheduledJobIds: Array<string> = []
  const dismissedRecoveryIds = new Set<string>()

  const setFeedState = (nextState: FocusRoomFeedState) => {
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
    const metadata = await repositories.feedRepository.listMetadata()
    const loaded = await Promise.all(
      metadata.map(async (item) => ({
        dialogue: await repositories.dialogueRepository.getDialogue(item.dialogueId),
        metadata: item,
      })),
    )
    const available = loaded.flatMap((item) =>
      item.dialogue === null ? [] : [{dialogue: item.dialogue, metadata: item.metadata}],
    )

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
    const itemGroups = await Promise.all(
      connections.map((connection) => getRepositories().feedRepository.listItems(connection.id)),
    )
    const nextIssues = itemGroups
      .flat()
      .filter((item) => item.status === 'failed' || item.status === 'too-long')
      .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))

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
    const metadata = await repositories.feedRepository.listMetadata()
    const stored = await Promise.all(
      metadata.map(async (item) => ({
        dialogue: await repositories.dialogueRepository.getDialogue(item.dialogueId),
        metadata: item,
      })),
    )
    const malformed = stored.filter(
      (item): item is FeedDialogueListItem =>
        item.dialogue !== null &&
        isMalformedDevFeedDialogue({dialogue: item.dialogue, metadata: item.metadata}),
    )

    await Promise.all(
      malformed.map(async (item) => {
        await repositories.dialogueRepository.deleteDialogue(item.dialogue.id)
        await Promise.all([
          repositories.feedRepository.removeMetadata(item.dialogue.id),
          repositories.feedRepository.removeItem(
            item.metadata.feedConnectionId,
            item.metadata.feedItemId,
          ),
        ])
      }),
    )

    if (malformed.length > 0) {
      await props.events.refreshDialogues()
    }

    const connections = createFeedConnectionRepository(window.localStorage).list()
    const itemGroups = await Promise.all(
      connections.map((connection) => repositories.feedRepository.listItems(connection.id)),
    )
    const legacyFailures = itemGroups.flat().filter(isLegacyDevFeedFailure)
    await Promise.all(
      legacyFailures.map((item) =>
        repositories.feedRepository.removeItem(item.feedConnectionId, item.feedItemId),
      ),
    )
  }
  const cleanupExpiredDialogues = async (now: Date) => {
    const repositories = getRepositories()
    const expired = await repositories.feedRepository.listExpiredMetadata(now.toISOString())
    const removable = findRemovableExpiredDialogues({
      expired,
      isDialogueScheduled: props.events.isDialogueScheduled,
    })

    await Promise.all(
      removable.map(async (metadata) => {
        await repositories.dialogueRepository.deleteDialogue(metadata.dialogueId)
        await repositories.feedRepository.removeMetadata(metadata.dialogueId)
      }),
    )

    if (removable.length > 0) {
      await Promise.all([reloadDialogues(), props.events.refreshDialogues()])
    }
  }
  const prepareModel = async (modelId: SupertonicModelId) => {
    if (client !== null && preparedModelId === modelId) {
      return true
    }

    client?.dispose()
    const nextClient = createSupertonicClient()
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
    generated: Awaited<ReturnType<typeof generateDialogueAudio>> & {readonly ok: true},
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
      modelId: job.modelId,
      segments: generated.value.segments,
      text: job.script,
      updatedAt: nowIso,
      version: 1,
      voiceId: job.voiceId,
    } satisfies FocusRoomDialogue
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
  const generateJob = async (job: FeedDialogueJob) => {
    const repositories = getRepositories()
    const now = new Date().toISOString()
    await repositories.feedRepository.updateJob({...job, status: 'generating', updatedAt: now})
    const isPrepared = await prepareModel(job.modelId)

    if (!isPrepared || client === null) {
      await failJob(job, '피드 음성 모델을 준비하지 못했어요.')
      return
    }

    const currentClient = client
    setFeedState({
      message: `${job.itemTitle} 음성을 만들고 있어요.`,
      progress: null,
      status: 'generating',
    })
    const generated = await generateDialogueAudio({
      client: currentClient,
      modelId: job.modelId,
      onChunk: (completed, total) => {
        if (client === currentClient && !isDisposed) {
          setFeedState({
            message: `${job.itemTitle} · ${completed}/${total} 구간 생성 중`,
            progress: Math.round((completed / total) * MAXIMUM_PROGRESS),
            status: 'generating',
          })
        }
      },
      text: job.script,
      voiceId: job.voiceId,
    })

    if (isDisposed || client !== currentClient) {
      return
    }

    if (!generated.ok) {
      await failJob(job, generated.message)
      return
    }

    await completeJob(job, generated)
  }
  const runScheduledJobs = async () => {
    if (isGenerating || isDisposed) {
      return
    }

    isGenerating = true

    try {
      while (scheduledJobIds.length > 0) {
        if (isDisposed) {
          return
        }

        const jobId = scheduledJobIds.shift()
        const jobs = await getRepositories().feedRepository.listJobs()
        const job = jobs.find((item) => item.id === jobId && item.status === 'queued')

        if (job !== undefined) {
          try {
            await generateJob(job)
          } catch (error: unknown) {
            console.error('Failed to process feed dialogue job.', error)
            await failJob(job, '피드 대화를 저장하지 못했어요.')
          }
        }
      }
    } finally {
      isGenerating = false

      if (!isDisposed) {
        setFeedState({message: '다음 피드 확인을 기다리고 있어요.', status: 'idle'})
      }
    }
  }
  const scheduleJobs = (jobIds: ReadonlyArray<string>) => {
    for (const jobId of jobIds) {
      if (!scheduledJobIds.includes(jobId)) {
        scheduledJobIds.push(jobId)
      }
    }

    if (jobIds.length === 0) {
      return
    }

    runScheduledJobs().catch((error: unknown) => {
      console.error('Unexpected feed generation queue failure.', error)
    })
  }
  const syncNow = async () => {
    if (isSyncing || isDisposed) {
      return
    }

    isSyncing = true
    const now = new Date()

    try {
      const connectionRepository = createFeedConnectionRepository(window.localStorage)
      const connections = connectionRepository.list()

      if (connections.length === 0) {
        setFeedState({message: '설정에서 구독 피드를 추가해 주세요.', status: 'idle'})
        return
      }

      setFeedState({message: '새 피드를 확인하고 있어요…', progress: null, status: 'syncing'})
      const summary = await synchronizeFeeds({
        connections,
        createId: () => crypto.randomUUID(),
        fetcher: createFeedFetcher(),
        modelId: DEFAULT_FEED_MODEL_ID,
        now,
        repository: getRepositories().feedRepository,
      })
      await reloadIssues()

      if (summary.successfulConnections > 0) {
        await cleanupExpiredDialogues(now)
      }

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
      isSyncing = false
    }
  }

  onMount(() => {
    dialogueRepository = createFocusRoomDialogueRepository()
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

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener(FEED_CONNECTIONS_CHANGED_EVENT, handleConnectionChange)
    initialize().catch((error: unknown) => {
      console.error('Failed to initialize focus room feeds.', error)
      setFeedState({message: '피드 기능을 시작하지 못했어요.', status: 'error'})
    })
    onCleanup(() => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener(FEED_CONNECTIONS_CHANGED_EVENT, handleConnectionChange)
    })
  })

  onCleanup(() => {
    isDisposed = true
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
          // AI_NOTE - A user stop dismisses the whole feed batch; cancellations and playback failures do not.
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
      scheduleJobs(jobIds)
    },
    state,
    syncNow,
    unlistenedDialogues,
  }
}
