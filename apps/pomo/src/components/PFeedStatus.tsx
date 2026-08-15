import {Show} from 'solid-js'

import {PButton} from '../design-system/PButton'
import {usePFeedContext} from '../features/focus-room-feed'

export const PFeedStatus = () => {
  const feeds = usePFeedContext()
  const handleListenAll = () => {
    feeds.listenAll().catch((error: unknown) => {
      console.error('Failed to play queued feed dialogues.', error)
    })
  }
  const handleRetry = () => {
    feeds.retryRecovery().catch((error: unknown) => {
      console.error('Failed to retry feed dialogues.', error)
    })
  }
  const handleDelete = () => {
    feeds.deleteRecovery().catch((error: unknown) => {
      console.error('Failed to delete feed dialogue jobs.', error)
    })
  }

  return (
    <Show when={!feeds.isListening()}>
      <Show
        when={feeds.recoveryJobs().length > 0}
        fallback={
          <Show
            when={feeds.latestReady()}
            fallback={
              <Show when={feeds.state().status !== 'idle'}>
                <div
                  aria-live="polite"
                  class="pomo-feed-status pomo-static-focus-glass"
                  data-state={feeds.state().status}
                  role="status"
                >
                  <span
                    aria-hidden="true"
                    class={
                      feeds.state().status === 'error'
                        ? 'i-tabler-alert-circle size-5'
                        : 'pomo-feed-status__spinner'
                    }
                  />
                  <span class="pomo-feed-status__copy">
                    <strong>
                      {feeds.state().status === 'error' ? '피드 확인 필요' : '피드 읽는 중'}
                    </strong>
                    <small>{feeds.state().message}</small>
                  </span>
                  <Show when={feeds.state().status === 'error'}>
                    <PButton
                      class="pomo-feed-status__action"
                      onPress={feeds.syncNow}
                      size="small"
                      tone="secondary"
                    >
                      다시 확인
                    </PButton>
                  </Show>
                </div>
              </Show>
            }
          >
            {(ready) => (
              <div
                aria-live="polite"
                class="pomo-feed-status pomo-static-focus-glass"
                data-state="ready"
                role="status"
              >
                <span aria-hidden="true" class="i-tabler-rss size-5" />
                <span class="pomo-feed-status__copy">
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
                  class="pomo-feed-status__action"
                  onPress={handleListenAll}
                  size="small"
                  tone="secondary"
                >
                  {feeds.unlistenedDialogues().length > 1 ? '연속 듣기' : '듣기'}
                </PButton>
              </div>
            )}
          </Show>
        }
      >
        <div
          aria-live="polite"
          class="pomo-feed-status pomo-static-focus-glass"
          data-state="recovery"
          role="status"
        >
          <span aria-hidden="true" class="i-tabler-refresh size-5" />
          <span class="pomo-feed-status__copy">
            <strong>미완성 피드 대화 {feeds.recoveryJobs().length}개</strong>
            <small>처음부터 다시 만들까요?</small>
          </span>
          <span class="pomo-feed-status__actions">
            <PButton
              class="pomo-feed-status__action"
              onPress={handleRetry}
              size="small"
              tone="secondary"
            >
              다시 만들기
            </PButton>
            <PButton
              class="pomo-feed-status__action"
              onPress={feeds.dismissRecovery}
              size="small"
              tone="secondary"
            >
              나중에
            </PButton>
            <PButton
              class="pomo-feed-status__action"
              onPress={handleDelete}
              size="small"
              tone="danger"
            >
              삭제
            </PButton>
          </span>
        </div>
      </Show>
    </Show>
  )
}
