import {createSignal, Show} from 'solid-js'

import {PButton} from './PButton'
import type {PSceneStyle} from '../features/focus-room-animation'
import {type FeedDialogueJob, usePFeedContext} from '../features/focus-room-feed'
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

const createFeedStatusActions = (
  feeds: ReturnType<typeof usePFeedContext>,
  modelDownload: ReturnType<typeof useModelDownload>,
) => {
  const [downloadSize, setDownloadSize] = createSignal<string | null>(null)
  const [pendingModelIds, setPendingModelIds] = createSignal<ReadonlyArray<SupertonicModelId>>([])
  const [isCheckingModel, setIsCheckingModel] = createSignal(false)
  const handleListenAll = () => {
    feeds.listenAll().catch((error: unknown) => {
      console.error('Failed to play queued feed dialogues.', error)
    })
  }
  const retryRecovery = () => {
    feeds.retryRecovery().catch((error: unknown) => {
      console.error('Failed to retry feed dialogues.', error)
    })
  }
  const handleRetry = async () => {
    if (isCheckingModel()) {
      return
    }

    setIsCheckingModel(true)
    const missingDownloads = await getMissingModelDownloads(feeds.recoveryJobs())
    setIsCheckingModel(false)

    if (missingDownloads.size > 0) {
      setPendingModelIds(missingDownloads.modelIds)
      setDownloadSize(formatModelDownloadSize(missingDownloads.size))
      return
    }

    retryRecovery()
  }
  const handleConfirmRetry = async () => {
    const modelIds = pendingModelIds()
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
      retryRecovery()
    }
  }
  const handleDelete = () => {
    feeds.deleteRecovery().catch((error: unknown) => {
      console.error('Failed to delete feed dialogue jobs.', error)
    })
  }

  return {
    downloadSize,
    handleConfirmRetry,
    handleDelete,
    handleListenAll,
    handleRetry,
    isCheckingModel,
    setDownloadSize,
  }
}

export const PFeedStatus = (props: PFeedStatusProps) => {
  const feeds = usePFeedContext()
  const actions = createFeedStatusActions(feeds, useModelDownload())

  return (
    <>
      <Show when={!feeds.isListening()}>
        <Show
          when={feeds.recoveryJobs().length > 0}
          fallback={
            <Show
              when={feeds.latestReady()}
              fallback={
                <Show when={feeds.state().status !== 'idle'}>
                  <FeedStatusSurface sceneStyle={props.sceneStyle} state={feeds.state().status}>
                    <span
                      aria-hidden="true"
                      class={
                        feeds.state().status === 'error'
                          ? 'i-tabler-alert-circle size-5'
                          : CLASSES.feedStatusSpinner
                      }
                    />
                    <span class={CLASSES.feedStatusCopy}>
                      <strong>
                        {feeds.state().status === 'error'
                          ? m.feed_needs_attention()
                          : m.feed_reading()}
                      </strong>
                      <small>{feeds.state().message}</small>
                    </span>
                    <Show when={feeds.state().status === 'error'}>
                      <PButton
                        class={CLASSES.feedStatusAction}
                        onPress={feeds.syncNow}
                        size="small"
                        tone="secondary"
                      >
                        {m.feed_check_again()}
                      </PButton>
                    </Show>
                  </FeedStatusSurface>
                </Show>
              }
            >
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
                    class={CLASSES.feedStatusAction}
                    onPress={actions.handleListenAll}
                    size="small"
                    tone="secondary"
                  >
                    {feeds.unlistenedDialogues().length > 1 ? m.feed_listen_all() : m.feed_listen()}
                  </PButton>
                </FeedStatusSurface>
              )}
            </Show>
          }
        >
          <FeedStatusSurface sceneStyle={props.sceneStyle} state="recovery">
            <span aria-hidden="true" class="i-tabler-refresh size-5" />
            <span class={CLASSES.feedStatusCopy}>
              <strong>{m.feed_incomplete_count({count: feeds.recoveryJobs().length})}</strong>
              <small>{m.feed_retry_question()}</small>
            </span>
            <span class={CLASSES.feedStatusActions}>
              <PButton
                class={CLASSES.feedStatusAction}
                disabled={actions.isCheckingModel()}
                onPress={actions.handleRetry}
                size="small"
                tone="secondary"
              >
                {actions.isCheckingModel() ? m.feed_checking() : m.feed_retry()}
              </PButton>
              <PButton
                class={CLASSES.feedStatusAction}
                onPress={feeds.dismissRecovery}
                size="small"
                tone="secondary"
              >
                {m.feed_later()}
              </PButton>
              <PButton
                class={CLASSES.feedStatusAction}
                onPress={actions.handleDelete}
                size="small"
                tone="danger"
              >
                {m.feed_delete()}
              </PButton>
            </span>
          </FeedStatusSurface>
        </Show>
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
