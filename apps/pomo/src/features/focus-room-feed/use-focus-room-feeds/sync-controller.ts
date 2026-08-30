import {resolveCurrentGenerationSettings} from '../generation-settings-runtime'
import {createFeedConnectionRepository} from '../repository'
import {createFeedFetcher} from '../feed-runtime'
import {synchronizeFeeds} from '../feed-sync'
import type {FeedDialogueRepository} from '../feed-dialogue-repository'
import type {PFeedState} from '../feed-controller'
import {beginFeedSync, createFeedSyncGate, finishFeedSync} from '../sync-gate'

export interface CreateFeedSyncControllerOptions {
  readonly cleanupExpiredDialogues: (now: Date) => Promise<void>
  readonly discardJobsForMissingConnections: (
    connectionIds: ReadonlySet<string>,
    updatedAt: string,
  ) => Promise<void>
  readonly getFeedRepository: () => FeedDialogueRepository
  readonly isDisposed: () => boolean
  readonly reloadIssues: () => Promise<void>
  readonly scheduleJobs: (jobIds: ReadonlyArray<string>) => void
  readonly setState: (state: PFeedState) => void
}

export interface FeedSyncController {
  readonly syncNow: () => Promise<void>
}

/** Owns feed synchronization gating and connection refresh policy. */
export const createFeedSyncController = (
  options: CreateFeedSyncControllerOptions,
): FeedSyncController => {
  const syncGate = createFeedSyncGate()

  const syncNow = async (): Promise<void> => {
    if (options.isDisposed() || !beginFeedSync(syncGate)) {
      return
    }

    const now = new Date()

    try {
      const connectionRepository = createFeedConnectionRepository(window.localStorage)
      const connections = connectionRepository.list()
      await options.discardJobsForMissingConnections(
        new Set(connections.map((connection) => connection.id)),
        now.toISOString(),
      )
      await options.cleanupExpiredDialogues(now)
      await options.reloadIssues()

      if (connections.length === 0) {
        options.setState({message: '설정에서 구독 피드를 추가해 주세요.', status: 'idle'})
        return
      }

      options.setState({message: '새 피드를 확인하고 있어요…', progress: null, status: 'syncing'})
      const summary = await synchronizeFeeds({
        connections,
        createId: () => crypto.randomUUID(),
        fetcher: createFeedFetcher(),
        now,
        repository: options.getFeedRepository(),
        resolveGenerationSettings: resolveCurrentGenerationSettings,
      })

      if (summary.failures.length > 0) {
        options.setState({
          message: `${summary.failures.length}개 피드를 가져오지 못했어요. 주소나 CORS 설정을 확인해 주세요.`,
          status: 'error',
        })
      } else if (summary.queuedJobIds.length === 0) {
        options.setState({message: '새 피드가 없어요.', status: 'idle'})
      }

      options.scheduleJobs(summary.queuedJobIds)
    } catch (error: unknown) {
      console.error('Failed to synchronize focus room feeds.', error)
      options.setState({message: '피드를 확인하지 못했어요.', status: 'error'})
    } finally {
      if (finishFeedSync(syncGate) && !options.isDisposed()) {
        await syncNow()
      }
    }
  }

  return {syncNow}
}
