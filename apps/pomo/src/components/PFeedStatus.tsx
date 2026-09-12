import {FeedRecoveryNotice} from './feed-status/FeedRecoveryNotice'
import {useFeedProgress} from './feed-status/use-feed-progress'
import {createEffect, createSignal, Match, Show, Switch} from 'solid-js'
import {PButton} from './PButton'
import type {PSceneStyle} from '../features/focus-room-animation'
import {type FeedDialogueJob, type PFeedState, usePFeedContext} from '../features/focus-room-feed'
import {formatModelDownloadSize} from '../features/model-storage'
import {type ModelDownloadResult, useModelDownload} from '../features/model-download'
import {
  getSupertonicModel,
  isSupertonicModelDownloaded,
  type SupertonicModelId,
} from '../features/supertonic'
import * as m from '@paraglide/message'
import {FeedStatusSurface} from './feed-status/Surface'
import {CLASSES} from './feed-status/shared'
import {PModelDownloadConsent} from './PModelDownloadConsent'
import {FeedGenerationStatus} from './feed-status/FeedGenerationStatus'

interface PFeedStatusProps {
  readonly sceneStyle?: PSceneStyle
}

interface MissingModelDownloads {
  readonly modelIds: ReadonlyArray<SupertonicModelId>
  readonly size: number
}

const getMissingModelDownloads = async (
  jobs: ReadonlyArray<FeedDialogueJob>,
): Promise<MissingModelDownloads> => {
  const modelIds = [...new Set(jobs.map((job) => job.modelId))]
  const modelStates = await Promise.all(
    modelIds.map(async (modelId) => ({
      downloaded: await isSupertonicModelDownloaded({modelId}),
      modelId,
    })),
  )
  const missingStates = modelStates.filter((state) => !state.downloaded)
  return {
    modelIds: missingStates.map((state) => state.modelId),
    size: missingStates.reduce((total, state) => total + getSupertonicModel(state.modelId).size, 0),
  }
}

const getErrorState = (state: PFeedState) => (state.status === 'error' ? state : null)

const createFeedStatusActions = (
  feeds: ReturnType<typeof usePFeedContext>,
  modelDownload: ReturnType<typeof useModelDownload>,
  activity: ReturnType<typeof useFeedProgress>,
) => {
  const [downloadSize, setDownloadSize] = createSignal<string | null>(null)
  const [pendingModelIds, setPendingModelIds] = createSignal<ReadonlyArray<SupertonicModelId>>([])
  const [isCheckingModel, setIsCheckingModel] = createSignal(false)
  const [isRetrying, setIsRetrying] = createSignal(false)
  const [hasRetryError, setHasRetryError] = createSignal(false)
  const isRetryDisabled = () =>
    isCheckingModel() ||
    isRetrying() ||
    modelDownload.state().status === 'loading' ||
    activity.generation() !== null
  const handleListenAll = () => {
    feeds.listenAll().catch((error: unknown) => {
      console.error('Failed to play queued feed dialogues.', error)
    })
  }
  const retryRecovery = async () => {
    try {
      await feeds.retryRecovery()
    } catch (error: unknown) {
      console.error('Failed to retry feed dialogues.', error)
      setHasRetryError(true)
    } finally {
      setIsRetrying(false)
    }
  }
  const handleRetry = async () => {
    if (isRetryDisabled()) {
      return
    }

    setHasRetryError(false)
    setIsCheckingModel(true)
    let missingDownloads: MissingModelDownloads

    try {
      missingDownloads = await getMissingModelDownloads(feeds.recoveryJobs())
    } catch (error: unknown) {
      console.error('Failed to check feed dialogue models.', error)
      setHasRetryError(true)
      return
    } finally {
      setIsCheckingModel(false)
    }

    if (isRetryDisabled()) {
      return
    }

    if (missingDownloads.size > 0) {
      setPendingModelIds(missingDownloads.modelIds)
      setDownloadSize(formatModelDownloadSize(missingDownloads.size))
      return
    }

    setIsRetrying(true)
    await retryRecovery()
  }
  const handleConfirmRetry = async () => {
    if (isRetryDisabled()) {
      return
    }

    const modelIds = pendingModelIds()
    setIsRetrying(true)
    setDownloadSize(null)
    const result = await modelIds.reduce<Promise<ModelDownloadResult>>(
      async (previousDownload, modelId) => {
        const previousResult = await previousDownload
        return previousResult.status === 'complete'
          ? modelDownload.startVoiceModel(modelId)
          : previousResult
      },
      Promise.resolve({status: 'complete'}),
    )

    if (result.status === 'complete') {
      await retryRecovery()
    } else {
      setIsRetrying(false)
    }
  }
  const handleDelete = () => {
    feeds.deleteRecovery().catch((error: unknown) => {
      console.error('Failed to delete feed dialogue jobs.', error)
    })
  }
  createEffect(() => {
    if (feeds.recoveryJobs().length === 0) {
      setHasRetryError(false)
    }
  })

  createEffect(() => {
    if (downloadSize() !== null && isRetryDisabled()) {
      setDownloadSize(null)
    }
  })

  return {
    downloadSize,
    handleConfirmRetry,
    handleDelete,
    handleListenAll,
    handleRetry,
    hasRetryError,
    isCheckingModel,
    isRetryDisabled,
    isRetrying,
    setDownloadSize,
  }
}

export const PFeedStatus = (props: PFeedStatusProps) => {
  const feeds = usePFeedContext()
  const modelDownload = useModelDownload()
  const activity = useFeedProgress(() => feeds, modelDownload)
  const actions = createFeedStatusActions(feeds, modelDownload, activity)
  const retryStatusMessage = () => {
    const download = activity.activeDownload()
    return download === null
      ? m.feed_retrying()
      : m.feed_downloading_model({label: download.label, percentage: download.percentage})
  }
  const isRetryInProgress = () => actions.isRetrying() || activity.activeDownload() !== null
  const activeGenerationState = activity.generation
  const errorState = () => getErrorState(feeds.state())
  return (
    <>
      <Show when={!feeds.isListening()}>
        <Switch>
          <Match when={activity.stopping()}>
            <FeedGenerationStatus
              cancelDisabled
              message={m.feed_stopping()}
              onCancel={activity.handleStop}
              sceneStyle={props.sceneStyle}
              state="generating"
            />
          </Match>
          <Match when={isRetryInProgress()}>
            <FeedGenerationStatus
              cancelDisabled={activity.stopping()}
              message={retryStatusMessage()}
              onCancel={activity.handleStop}
              sceneStyle={props.sceneStyle}
              state="generating"
            />
          </Match>
          <Match when={activeGenerationState()}>
            {(feedState) => (
              <FeedGenerationStatus
                cancelDisabled={activity.stopping()}
                message={feedState().message}
                onCancel={activity.handleStop}
                sceneStyle={props.sceneStyle}
                state={feedState().status}
              />
            )}
          </Match>
          <Match when={feeds.recoveryJobs().length > 0}>
            <FeedRecoveryNotice feeds={feeds} actions={actions} sceneStyle={props.sceneStyle} />
          </Match>
          <Match when={feeds.latestReady()}>
            {(ready) => (
              <FeedStatusSurface sceneStyle={props.sceneStyle} state="ready">
                <span aria-hidden="true" class="i-tabler-rss size-5" />
                <span class={CLASSES.feedStatusCopy}>
                  <strong>
                    {feeds.unlistenedDialogues().length > 1
                      ? m.feed_ready_count({count: feeds.unlistenedDialogues().length})
                      : m.feed_ready_one()}
                  </strong>
                  <small>
                    {ready().metadata.sourceTitle} · {ready().metadata.itemTitle}
                  </small>
                </span>
                <PButton
                  bordered
                  transparent
                  class={CLASSES.feedStatusAction}
                  onPress={actions.handleListenAll}
                  size="small"
                  tone="secondary"
                >
                  {feeds.unlistenedDialogues().length > 1 ? m.feed_listen_all() : m.feed_listen()}
                </PButton>
              </FeedStatusSurface>
            )}
          </Match>
          <Match when={errorState()}>
            {(feedState) => (
              <FeedStatusSurface sceneStyle={props.sceneStyle} state="error">
                <span aria-hidden="true" class="i-tabler-alert-circle size-5" />
                <span class={CLASSES.feedStatusCopy}>
                  <strong>{m.feed_needs_attention()}</strong>
                  <small>{feedState().message}</small>
                </span>
                <PButton
                  bordered
                  transparent
                  class={CLASSES.feedStatusAction}
                  onPress={feeds.syncNow}
                  size="small"
                  tone="secondary"
                >
                  {m.feed_check_again()}
                </PButton>
              </FeedStatusSurface>
            )}
          </Match>
        </Switch>
      </Show>
      <PModelDownloadConsent
        actionLabel={m.feed_create_voice()}
        downloadSize={actions.downloadSize() ?? ''}
        isOpen={actions.downloadSize() !== null}
        onCancel={() => actions.setDownloadSize(null)}
        onConfirm={actions.handleConfirmRetry}
      />
    </>
  )
}
