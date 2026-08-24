import {createSignal, Show} from 'solid-js'

import {PButton} from '../design-system/PButton'
import type {PSceneStyle} from '../features/focus-room-animation'
import {type FeedDialogueJob, usePFeedContext} from '../features/focus-room-feed'
import {formatModelDownloadSize} from '../features/model-storage'
import {getSupertonicModel, isSupertonicModelDownloaded} from '../features/supertonic'
import {FeedStatusSurface} from './feed-status/Surface'
import {CLASSES} from './feed-status/shared'
import {PModelDownloadConsent} from './PModelDownloadConsent'

interface PFeedStatusProps {
  readonly sceneStyle?: PSceneStyle
}

const getMissingModelDownloadSize = async (jobs: ReadonlyArray<FeedDialogueJob>) => {
  const modelIds = [...new Set(jobs.map((job) => job.modelId))]
  const modelStates = await Promise.all(
    modelIds.map(async (modelId) => ({
      downloaded: await isSupertonicModelDownloaded({modelId}),
      modelId,
    })),
  )
  return modelStates
    .filter((state) => !state.downloaded)
    .reduce((total, state) => total + getSupertonicModel(state.modelId).size, 0)
}

export const PFeedStatus = (props: PFeedStatusProps) => {
  const feeds = usePFeedContext()
  const [downloadSize, setDownloadSize] = createSignal<string | null>(null)
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
    const missingSize = await getMissingModelDownloadSize(feeds.recoveryJobs())
    setIsCheckingModel(false)

    if (missingSize > 0) {
      setDownloadSize(formatModelDownloadSize(missingSize))
      return
    }

    retryRecovery()
  }
  const handleConfirmRetry = () => {
    setDownloadSize(null)
    retryRecovery()
  }
  const handleDelete = () => {
    feeds.deleteRecovery().catch((error: unknown) => {
      console.error('Failed to delete feed dialogue jobs.', error)
    })
  }

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
                        {feeds.state().status === 'error' ? '피드 확인 필요' : '피드 읽는 중'}
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
                        다시 확인
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
                        ? `새 피드 대화 ${feeds.unlistenedDialogues().length}개가 준비됐어요`
                        : '새 피드 대화가 준비됐어요'}
                    </strong>
                    <small>
                      {ready().metadata.sourceTitle} · {ready().metadata.itemTitle}
                    </small>
                  </span>
                  <PButton
                    class={CLASSES.feedStatusAction}
                    onPress={handleListenAll}
                    size="small"
                    tone="secondary"
                  >
                    {feeds.unlistenedDialogues().length > 1 ? '연속 듣기' : '듣기'}
                  </PButton>
                </FeedStatusSurface>
              )}
            </Show>
          }
        >
          <FeedStatusSurface sceneStyle={props.sceneStyle} state="recovery">
            <span aria-hidden="true" class="i-tabler-refresh size-5" />
            <span class={CLASSES.feedStatusCopy}>
              <strong>미완성 피드 대화 {feeds.recoveryJobs().length}개</strong>
              <small>처음부터 다시 만들까요?</small>
            </span>
            <span class={CLASSES.feedStatusActions}>
              <PButton
                class={CLASSES.feedStatusAction}
                disabled={isCheckingModel()}
                onPress={handleRetry}
                size="small"
                tone="secondary"
              >
                {isCheckingModel() ? '확인 중…' : '다시 시도'}
              </PButton>
              <PButton
                class={CLASSES.feedStatusAction}
                onPress={feeds.dismissRecovery}
                size="small"
                tone="secondary"
              >
                나중에
              </PButton>
              <PButton
                class={CLASSES.feedStatusAction}
                onPress={handleDelete}
                size="small"
                tone="danger"
              >
                삭제
              </PButton>
            </span>
          </FeedStatusSurface>
        </Show>
      </Show>
      <PModelDownloadConsent
        actionLabel="피드 음성 만들기"
        downloadSize={downloadSize() ?? ''}
        isOpen={downloadSize() !== null}
        onCancel={() => setDownloadSize(null)}
        onConfirm={handleConfirmRetry}
      />
    </>
  )
}
