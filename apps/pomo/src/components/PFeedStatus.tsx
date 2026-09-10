import {createEffect, createSignal, Match, Show, Switch} from 'solid-js'
import {PButton} from './PButton'
import type {PSceneStyle} from '../features/focus-room-animation'
import {type FeedDialogueJob, type PFeedState, usePFeedContext} from '../features/focus-room-feed'
import {formatModelDownloadSize} from '../features/model-storage'
import {
  type LoadingModelDownloadState,
  type ModelDownloadResult,
  type ModelDownloadState,
  useModelDownload,
} from '../features/model-download'
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

interface ActiveFeedState {
  readonly message: string
  readonly progress: number | null
  readonly status: 'generating' | 'preparing'
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

const getRecoveryModelDownload = (
  downloadState: ModelDownloadState,
  jobs: ReadonlyArray<FeedDialogueJob>,
): LoadingModelDownloadState | null => {
  if (downloadState.status !== 'loading' || downloadState.target.kind !== 'voice') {
    return null
  }

  return jobs.some((job) => job.modelId === downloadState.target.modelId) ? downloadState : null
}

const getActiveGenerationState = (state: PFeedState): ActiveFeedState | null => {
  if (state.status !== 'generating' && state.status !== 'preparing') {
    return null
  }

  return {message: state.message, progress: state.progress, status: state.status}
}

const getErrorState = (state: PFeedState) => (state.status === 'error' ? state : null)

const createFeedStatusActions = (
  feeds: ReturnType<typeof usePFeedContext>,
  modelDownload: ReturnType<typeof useModelDownload>,
) => {
  const [downloadSize, setDownloadSize] = createSignal<string | null>(null)
  const [pendingModelIds, setPendingModelIds] = createSignal<ReadonlyArray<SupertonicModelId>>([])
  const [isCheckingModel, setIsCheckingModel] = createSignal(false)
  const [isCancelling, setIsCancelling] = createSignal(false)
  const [isRetrying, setIsRetrying] = createSignal(false)
  const [hasRetryError, setHasRetryError] = createSignal(false)
  const isRetryDisabled = () =>
    isCheckingModel() ||
    isRetrying() ||
    modelDownload.state().status === 'loading' ||
    getActiveGenerationState(feeds.state()) !== null
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
  const handleCancel = async () => {
    setIsCancelling(true)
    const downloadState = modelDownload.state()
    if (getRecoveryModelDownload(downloadState, feeds.recoveryJobs()) !== null) {
      modelDownload.cancel()
    }

    try {
      await feeds.cancelProcessing()
    } catch (error: unknown) {
      console.error('Failed to cancel feed processing.', error)
    } finally {
      setIsCancelling(false)
    }
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
    handleCancel,
    handleConfirmRetry,
    handleDelete,
    handleListenAll,
    handleRetry,
    hasRetryError,
    isCancelling,
    isCheckingModel,
    isRetryDisabled,
    isRetrying,
    setDownloadSize,
  }
}

const getRetryStatusMessage = (download: ReturnType<typeof getRecoveryModelDownload>) =>
  download === null
    ? m.feed_retrying()
    : m.feed_downloading_model({label: download.label, percentage: download.percentage})

export const PFeedStatus = (props: PFeedStatusProps) => {
  const feeds = usePFeedContext()
  const modelDownload = useModelDownload()
  const actions = createFeedStatusActions(feeds, modelDownload)
  const activeRecoveryDownload = () =>
    getRecoveryModelDownload(modelDownload.state(), feeds.recoveryJobs())
  const retryStatusMessage = () => getRetryStatusMessage(activeRecoveryDownload())
  const isRetryInProgress = () => actions.isRetrying() || activeRecoveryDownload() !== null
  const activeGenerationState = () => getActiveGenerationState(feeds.state())
  const errorState = () => getErrorState(feeds.state())
  return (
    <>
      <Show when={!feeds.isListening()}>
        <Switch>
          <Match when={actions.isCancelling()}>
            <FeedGenerationStatus
              cancelDisabled
              message={m.feed_stopping()}
              onCancel={actions.handleCancel}
              sceneStyle={props.sceneStyle}
              state="generating"
            />
          </Match>
          <Match when={isRetryInProgress()}>
            <FeedGenerationStatus
              cancelDisabled={actions.isCancelling()}
              message={retryStatusMessage()}
              onCancel={actions.handleCancel}
              sceneStyle={props.sceneStyle}
              state="generating"
            />
          </Match>
          <Match when={activeGenerationState()}>
            {(feedState) => (
              <FeedGenerationStatus
                cancelDisabled={actions.isCancelling()}
                message={feedState().message}
                onCancel={actions.handleCancel}
                sceneStyle={props.sceneStyle}
                state={feedState().status}
              />
            )}
          </Match>
          <Match when={feeds.recoveryJobs().length > 0}>
            <FeedStatusSurface sceneStyle={props.sceneStyle} state="recovery">
              <span aria-hidden="true" class="i-tabler-refresh size-5" />
              <span class={CLASSES.feedStatusCopy}>
                <strong>{m.feed_incomplete_count({count: feeds.recoveryJobs().length})}</strong>
                <small>
                  {actions.hasRetryError() ? m.feed_retry_failed() : m.feed_retry_question()}
                </small>
              </span>
              <span class={CLASSES.feedStatusActions}>
                <PButton
                  bordered
                  transparent
                  class={CLASSES.feedStatusAction}
                  disabled={actions.isRetryDisabled()}
                  onPress={actions.handleRetry}
                  size="small"
                  tone="secondary"
                >
                  {actions.isCheckingModel() ? m.feed_checking() : m.feed_retry()}
                </PButton>
                <PButton
                  bordered
                  transparent
                  class={CLASSES.feedStatusAction}
                  disabled={actions.isCheckingModel()}
                  onPress={feeds.dismissRecovery}
                  size="small"
                  tone="secondary"
                >
                  {m.feed_later()}
                </PButton>
                <PButton
                  bordered
                  transparent
                  class={CLASSES.feedStatusAction}
                  disabled={actions.isCheckingModel()}
                  onPress={actions.handleDelete}
                  size="small"
                  tone="danger"
                >
                  {m.feed_delete()}
                </PButton>
              </span>
            </FeedStatusSurface>
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
