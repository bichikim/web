import {Show} from 'solid-js'

import {useFocusRoomFeedContext} from '../features/focus-room-feed'
import './FocusRoomFeedStatus.css'

export const FocusRoomFeedStatus = () => {
  const feeds = useFocusRoomFeedContext()
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
                  class="focus-room-feed-status"
                  data-state={feeds.state().status}
                  role="status"
                >
                  <span
                    aria-hidden="true"
                    class={
                      feeds.state().status === 'error'
                        ? 'i-tabler-alert-circle size-5'
                        : 'focus-room-feed-status__spinner'
                    }
                  />
                  <span class="focus-room-feed-status__copy">
                    <strong>
                      {feeds.state().status === 'error' ? '피드 확인 필요' : '피드 읽는 중'}
                    </strong>
                    <small>{feeds.state().message}</small>
                  </span>
                  <Show when={feeds.state().status === 'error'}>
                    <button onClick={feeds.syncNow} type="button">
                      다시 확인
                    </button>
                  </Show>
                </div>
              </Show>
            }
          >
            {(ready) => (
              <div
                aria-live="polite"
                class="focus-room-feed-status"
                data-state="ready"
                role="status"
              >
                <span aria-hidden="true" class="i-tabler-rss size-5" />
                <span class="focus-room-feed-status__copy">
                  <strong>
                    {feeds.unlistenedDialogues().length > 1
                      ? `새 피드 대화 ${feeds.unlistenedDialogues().length}개가 준비됐어요`
                      : '새 피드 대화가 준비됐어요'}
                  </strong>
                  <small>
                    {ready().metadata.sourceTitle} · {ready().metadata.itemTitle}
                  </small>
                </span>
                <button onClick={handleListenAll} type="button">
                  {feeds.unlistenedDialogues().length > 1 ? '연속 듣기' : '듣기'}
                </button>
              </div>
            )}
          </Show>
        }
      >
        <div aria-live="polite" class="focus-room-feed-status" data-state="recovery" role="status">
          <span aria-hidden="true" class="i-tabler-refresh size-5" />
          <span class="focus-room-feed-status__copy">
            <strong>미완성 피드 대화 {feeds.recoveryJobs().length}개</strong>
            <small>처음부터 다시 만들까요?</small>
          </span>
          <span class="focus-room-feed-status__actions">
            <button onClick={handleRetry} type="button">
              다시 만들기
            </button>
            <button onClick={feeds.dismissRecovery} type="button">
              나중에
            </button>
            <button onClick={handleDelete} type="button">
              삭제
            </button>
          </span>
        </div>
      </Show>
    </Show>
  )
}
