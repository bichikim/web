import {usePreference} from 'src/hooks/use-preference'
import {createAutomaticDialoguePreferenceOptions} from '../focus-room-dialogue/automatic-dialogue-settings'
import {useAutoPreparePreference} from './use-auto-prepare-preference'
import {isFeedJobAwaitingAction} from './feed-dialogue-schema'
import {onCleanup} from 'solid-js'

import {
  createPDialogueRepository,
  deleteDialogueAudio,
  type PDialogueRepository,
} from '../focus-room-dialogue/repository'
import {createFeedDialogueRepository, type FeedDialogueRepository} from './feed-dialogue-repository'
import {feedGenerationRuntime} from './generation-runtime'
import {
  createFeedGenerationController,
  type FeedGenerationController,
} from './generation-controller'
import {feedSettingsRuntime} from './settings-runtime'
import {synchronizeFeeds} from './feed-sync'
import type {PFeedController, UsePFeedsProps} from './feed-controller'
import {discardFeedJobs} from './feed-dialogue-lifecycle'
import {createFeedStateController} from './feed-state'
import {createFeedPlaybackController} from './feed-playback'
import {createFeedFetcher, FEED_POLLING_INTERVAL_MS} from './feed-runtime'
import {createFeedSyncController} from './sync-controller'
import {FEED_CONNECTIONS_CHANGED_EVENT} from './use-feed-connections'
import {useFeedRefreshEvents} from './use-feed-refresh-events'

export const usePFeeds = (props: UsePFeedsProps): PFeedController => {
  const settingsRuntime = props.settingsRuntime ?? feedSettingsRuntime
  const automaticPreparation = useAutoPreparePreference()
  const [automaticSettings] = usePreference(createAutomaticDialoguePreferenceOptions())
  const resolveGeneration = (connectionId: string) =>
    settingsRuntime.resolveGeneration(connectionId, automaticSettings() ?? undefined)
  let dialogueRepository: PDialogueRepository | null = null
  let feedRepository: FeedDialogueRepository | null = null
  let generationController: FeedGenerationController | null = null
  let isDisposed = false
  const getRepositories = () => {
    if (dialogueRepository === null || feedRepository === null) {
      throw new Error('피드 대화 저장소가 아직 준비되지 않았어요.')
    }

    return {dialogueRepository, feedRepository}
  }
  const feedState = createFeedStateController({
    events: props.events,
    getRepositories,
    listConnections: settingsRuntime.listConnections,
    now: () => new Date(),
  })
  const getGenerationController = () => {
    if (generationController === null) {
      throw new Error('피드 대화 저장소가 아직 준비되지 않았어요.')
    }

    return generationController
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

    getGenerationController().remove(new Set(jobIds))
    await feedState.reloadRecovery()
  }
  const scheduleJobs = (jobIds: ReadonlyArray<string>, allowModelDownload = false) =>
    getGenerationController().schedule({allowModelDownload, jobIds})
  const syncController = createFeedSyncController({
    autoPrepare: () => automaticPreparation.enabled() === true,
    cleanupExpiredDialogues: feedState.cleanupExpiredDialogues,
    createFetcher: createFeedFetcher,
    createId: () => crypto.randomUUID(),
    discardMissingConnections: discardJobsForMissingConnections,
    getConnections: settingsRuntime.listConnections,
    getRepository: () => getRepositories().feedRepository,
    getState: feedState.state,
    now: () => new Date(),
    onSynchronized: feedState.reloadRecovery,
    reloadIssues: feedState.reloadIssues,
    resolveGenerationSettings: resolveGeneration,
    scheduleJobs,
    setState: feedState.setState,
    synchronize: synchronizeFeeds,
  })
  const playback = createFeedPlaybackController({
    createId: () => crypto.randomUUID(),
    dialogues: feedState.dialogues,
    events: props.events,
    isDisposed: () => isDisposed,
    now: () => new Date(),
    repository: () => getRepositories().feedRepository,
    scheduleJobs,
    setDialogues: feedState.setDialogues,
  })
  useFeedRefreshEvents({
    connectionChangedEvent: FEED_CONNECTIONS_CHANGED_EVENT,
    async initialize() {
      dialogueRepository = createPDialogueRepository()
      feedRepository = createFeedDialogueRepository({deleteDialogueAudio})
      const repositories = getRepositories()
      generationController = createFeedGenerationController({
        createId: () => crypto.randomUUID(),
        dialogueRepository: repositories.dialogueRepository,
        feedRepository: repositories.feedRepository,
        getConnections: settingsRuntime.listConnections,
        getState: feedState.state,
        isRecoveryDismissed: (jobId) => feedState.isRecoveryDismissed(jobId),
        isSyncing: syncController.isSyncing,
        now: () => new Date(),
        onCompleted: async () => {
          await Promise.all([
            feedState.reloadDialogues(),
            feedState.reloadIssues(),
            props.events.refreshDialogues(),
          ])
        },
        onDiscarded: feedState.reloadRecovery,
        onFailed: async () => {
          await Promise.all([feedState.reloadRecovery(), feedState.reloadIssues()])
        },
        onRecovery: (jobs) => {
          feedState.setRecoveryJobs(jobs)
          feedState.setState({message: '다음 피드 확인을 기다리고 있어요.', status: 'idle'})
        },
        resolveGenerationSettings: resolveGeneration,
        runtime: feedGenerationRuntime,
        setState: feedState.setState,
      })
      await feedState.repairMalformedDialogues()
      const jobs = await repositories.feedRepository.interruptUnfinishedJobs(
        new Date().toISOString(),
      )
      feedState.setRecoveryJobs(jobs.filter((job) => isFeedJobAwaitingAction(job)))
      await feedState.reloadDialogues()
      await syncController.sync()
    },
    onInitializationFailure() {
      feedState.setState({message: '피드 기능을 시작하지 못했어요.', status: 'error'})
    },
    pollingIntervalMs: FEED_POLLING_INTERVAL_MS,
    refresh: syncController.sync,
    settings: automaticSettings,
  })

  onCleanup(() => {
    isDisposed = true
    generationController?.dispose()
    feedState.dispose()
    syncController.dispose()
    dialogueRepository?.dispose()
    feedRepository?.dispose()
  })

  return {
    automaticPreparation,
    cancelProcessing: async () => getGenerationController().cancel(),
    deleteRecovery: feedState.deleteRecovery,
    dialogues: feedState.dialogues,
    dismissRecovery: feedState.dismissRecovery,
    isListening: playback.isListening,
    issues: feedState.issues,
    latestReady: feedState.latestReady,
    listen: playback.listen,
    listenAll: playback.listenAll,
    onDeleteDialogue: feedState.deleteDialogue,
    recoveryJobs: feedState.recoveryJobs,
    async retryRecovery() {
      const jobIds = await feedState.retryRecovery()

      if (jobIds.length > 0) {
        scheduleJobs(jobIds, true)
      }
    },
    state: feedState.state,
    syncNow: syncController.sync,
    unlistenedDialogues: feedState.unlistenedDialogues,
  }
}
