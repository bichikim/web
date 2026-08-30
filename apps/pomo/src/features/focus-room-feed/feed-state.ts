import {createMemo, createSignal, type Setter} from 'solid-js'

import type {PEventContextValue} from '../focus-room-dialogue'
import {
  type FeedDialogueListItem,
  findFeedNotificationDialogue,
  type PFeedState,
} from './feed-controller'
import type {FeedDialogueRepository} from './feed-dialogue-repository'
import type {FeedDialogueJob, FeedItemRecord} from './feed-dialogue-schema'
import {
  deleteExpiredFeedDialogues,
  loadFeedDialogueList,
  loadFeedIssues,
} from './feed-dialogue-lifecycle'
import {repairStoredDevFeedDialogues} from './feed-dialogue-repair'
import type {FeedConnection} from './schema'
import type {PDialogueRepository} from '../focus-room-dialogue/repository'

interface FeedStateEvents extends Pick<
  PEventContextValue,
  'deleteDialogue' | 'isDialogueScheduled' | 'refreshDialogues'
> {}

interface FeedStateRepositories {
  readonly dialogueRepository: PDialogueRepository
  readonly feedRepository: FeedDialogueRepository
}

export interface CreateFeedStateControllerOptions {
  readonly events: FeedStateEvents
  readonly getRepositories: () => FeedStateRepositories
  readonly listConnections: () => ReadonlyArray<FeedConnection>
  readonly now: () => Date
}

export interface FeedStateController {
  readonly cleanupExpiredDialogues: (now: Date) => Promise<void>
  readonly deleteDialogue: (dialogueId: string) => Promise<void>
  readonly deleteRecovery: () => Promise<void>
  readonly dialogues: () => ReadonlyArray<FeedDialogueListItem>
  readonly dismissRecovery: () => void
  readonly dispose: () => void
  readonly isRecoveryDismissed: (jobId: string) => boolean
  readonly issues: () => ReadonlyArray<FeedItemRecord>
  readonly latestReady: () => FeedDialogueListItem | null
  readonly recoveryJobs: () => ReadonlyArray<FeedDialogueJob>
  readonly reloadDialogues: () => Promise<void>
  readonly reloadIssues: () => Promise<void>
  readonly reloadRecovery: () => Promise<void>
  readonly repairMalformedDialogues: () => Promise<void>
  readonly retryRecovery: () => Promise<ReadonlyArray<string>>
  readonly setDialogues: Setter<ReadonlyArray<FeedDialogueListItem>>
  readonly setRecoveryJobs: Setter<ReadonlyArray<FeedDialogueJob>>
  readonly setState: (state: PFeedState) => void
  readonly state: () => PFeedState
  readonly unlistenedDialogues: () => ReadonlyArray<FeedDialogueListItem>
}

export const createFeedStateController = (
  options: CreateFeedStateControllerOptions,
): FeedStateController => {
  const [dialogues, setDialogues] = createSignal<ReadonlyArray<FeedDialogueListItem>>([])
  const unlistenedDialogues = createMemo(() =>
    dialogues().filter((item) => item.metadata.listenedAt === null),
  )
  const latestReady = createMemo(() => findFeedNotificationDialogue(unlistenedDialogues()))
  const [issues, setIssues] = createSignal<ReadonlyArray<FeedItemRecord>>([])
  const [recoveryJobs, setRecoveryJobs] = createSignal<ReadonlyArray<FeedDialogueJob>>([])
  const [state, setState] = createSignal<PFeedState>({
    message: '구독 피드를 기다리고 있어요.',
    status: 'idle',
  })
  const dismissedRecoveryIds = new Set<string>()
  let isDisposed = false
  const reloadDialogues = async () => {
    const available = await loadFeedDialogueList(options.getRepositories())

    if (!isDisposed) {
      setDialogues(available)
    }
  }
  const reloadRecovery = async () => {
    const jobs = await options.getRepositories().feedRepository.listJobs()

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
    const connections = options.listConnections()
    const nextIssues = await loadFeedIssues({
      connectionIds: connections.map((connection) => connection.id),
      feedRepository: options.getRepositories().feedRepository,
    })

    if (!isDisposed) {
      setIssues(nextIssues)
    }
  }

  return {
    async cleanupExpiredDialogues(now) {
      const deletedCount = await deleteExpiredFeedDialogues({
        ...options.getRepositories(),
        isDialogueScheduled: options.events.isDialogueScheduled,
        now,
      })

      if (deletedCount > 0) {
        await Promise.all([reloadDialogues(), options.events.refreshDialogues()])
      }
    },
    async deleteDialogue(dialogueId) {
      const repository = options.getRepositories().feedRepository
      await options.events.deleteDialogue(dialogueId)

      try {
        await repository.removeMetadata(dialogueId)
      } finally {
        await reloadDialogues()
      }
    },
    async deleteRecovery() {
      const jobs = recoveryJobs()
      await options.getRepositories().feedRepository.deleteJobs(
        jobs.map((job) => job.id),
        options.now().toISOString(),
      )
      setRecoveryJobs([])
    },
    dialogues,
    dismissRecovery() {
      recoveryJobs().forEach((job) => dismissedRecoveryIds.add(job.id))
      setRecoveryJobs([])
    },
    dispose() {
      isDisposed = true
    },
    isRecoveryDismissed: (jobId) => dismissedRecoveryIds.has(jobId),
    issues,
    latestReady,
    recoveryJobs,
    reloadDialogues,
    reloadIssues,
    reloadRecovery,
    async repairMalformedDialogues() {
      const repairedCount = await repairStoredDevFeedDialogues({
        ...options.getRepositories(),
        connections: options.listConnections(),
      })

      if (repairedCount > 0) {
        await options.events.refreshDialogues()
      }
    },
    async retryRecovery() {
      const jobs = recoveryJobs()

      if (jobs.length === 0) {
        return []
      }

      const jobIds = jobs.map((job) => job.id)
      await options.getRepositories().feedRepository.retryJobs(jobIds, options.now().toISOString())
      setRecoveryJobs([])
      setState({
        message: '피드 대화를 다시 만들 준비 중…',
        progress: 0,
        status: 'preparing',
      })
      return jobIds
    },
    setDialogues,
    setRecoveryJobs,
    setState(nextState) {
      if (!isDisposed) {
        setState(nextState)
      }
    },
    state,
    unlistenedDialogues,
  }
}
