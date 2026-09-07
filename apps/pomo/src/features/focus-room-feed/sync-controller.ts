import type {PFeedState} from './feed-controller'
import type {FeedDialogueRepository} from './feed-dialogue-repository'
import type {FeedFetcher, FeedSyncSummary, SynchronizeFeedsOptions} from './feed-sync'
import type {FeedGenerationSettings} from './generation-settings'
import type {FeedConnection} from './schema'
import {beginFeedSync, createFeedSyncGate, finishFeedSync} from './sync-gate'

export interface CreateFeedSyncControllerOptions {
  readonly cleanupExpiredDialogues: (now: Date) => Promise<void>
  readonly createFetcher: () => FeedFetcher
  readonly createId: () => string
  readonly discardMissingConnections: (
    connectionIds: ReadonlySet<string>,
    updatedAt: string,
  ) => Promise<void>
  readonly getConnections: () => ReadonlyArray<FeedConnection>
  readonly getRepository: () => FeedDialogueRepository
  readonly now: () => Date
  readonly reloadIssues: () => Promise<void>
  readonly resolveGenerationSettings: (
    connectionId: string,
  ) => Promise<FeedGenerationSettings | null>
  readonly scheduleJobs: (jobIds: ReadonlyArray<string>) => void
  readonly setState: (state: PFeedState) => void
  readonly synchronize: (options: SynchronizeFeedsOptions) => Promise<FeedSyncSummary>
}

export interface FeedSyncController {
  readonly dispose: () => void
  readonly sync: () => Promise<void>
}

interface FeedSyncContext {
  isDisposed: boolean
  readonly gate: ReturnType<typeof createFeedSyncGate>
  readonly options: CreateFeedSyncControllerOptions
}

const runFeedSync = async (context: FeedSyncContext): Promise<void> => {
  if (context.isDisposed || !beginFeedSync(context.gate)) {
    return
  }

  const now = context.options.now()

  try {
    const connections = context.options.getConnections()
    await context.options.discardMissingConnections(
      new Set(connections.map((connection) => connection.id)),
      now.toISOString(),
    )
    await context.options.cleanupExpiredDialogues(now)
    await context.options.reloadIssues()

    if (connections.length === 0) {
      context.options.setState({
        message: '설정에서 구독 피드를 추가해 주세요.',
        status: 'idle',
      })
      return
    }

    context.options.setState({
      message: '새 피드를 확인하고 있어요…',
      progress: null,
      status: 'syncing',
    })
    const summary = await context.options.synchronize({
      connections,
      createId: context.options.createId,
      fetcher: context.options.createFetcher(),
      now,
      repository: context.options.getRepository(),
      resolveGenerationSettings: context.options.resolveGenerationSettings,
    })

    if (summary.failures.length > 0) {
      context.options.setState({
        message: `${summary.failures.length}개 피드를 가져오지 못했어요. 주소나 CORS 설정을 확인해 주세요.`,
        status: 'error',
      })
    } else if (summary.queuedJobIds.length === 0) {
      context.options.setState({message: '새 피드가 없어요.', status: 'idle'})
    }

    context.options.scheduleJobs(summary.queuedJobIds)
  } catch (error: unknown) {
    console.error('Failed to synchronize focus room feeds.', error)
    context.options.setState({message: '피드를 확인하지 못했어요.', status: 'error'})
  } finally {
    if (finishFeedSync(context.gate) && !context.isDisposed) {
      await runFeedSync(context)
    }
  }
}

export const createFeedSyncController = (
  options: CreateFeedSyncControllerOptions,
): FeedSyncController => {
  const context: FeedSyncContext = {
    gate: createFeedSyncGate(),
    isDisposed: false,
    options,
  }

  return {
    dispose() {
      context.isDisposed = true
    },
    sync: () => runFeedSync(context),
  }
}
