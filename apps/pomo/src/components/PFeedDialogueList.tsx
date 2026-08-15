import {createMemo, createSignal, For, Show} from 'solid-js'

import type {PFeedController} from '../features/focus-room-feed'

const MINUTES_PER_HOUR = 60
const SECONDS_PER_MINUTE = 60
const MILLISECONDS_PER_SECOND = 1000
const HOUR_MS = MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND
const DIALOGUE_PAGE_SIZE = 20

export interface PFeedDialogueListProps {
  readonly controller: PFeedController
}

const formatPublishedAt = (value: string) =>
  new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))

const formatRemaining = (value: string) => {
  const hours = Math.max(0, Math.ceil((Date.parse(value) - Date.now()) / HOUR_MS))
  return hours === 0 ? '다음 확인 때 정리' : `${hours}시간 후 정리`
}

export const PFeedDialogueList = (props: PFeedDialogueListProps) => {
  const [visibleDialogueCount, setVisibleDialogueCount] = createSignal(DIALOGUE_PAGE_SIZE)
  const [pendingDeleteId, setPendingDeleteId] = createSignal<string | null>(null)
  const [deleteError, setDeleteError] = createSignal<string | null>(null)
  const visibleDialogues = createMemo(() =>
    props.controller.dialogues().slice(0, visibleDialogueCount()),
  )
  const hiddenDialogueCount = () =>
    Math.max(0, props.controller.dialogues().length - visibleDialogueCount())
  const nextDialogueCount = () => Math.min(DIALOGUE_PAGE_SIZE, hiddenDialogueCount())
  const handleListen = (dialogueId: string) => {
    props.controller.listen(dialogueId).catch((error: unknown) => {
      console.error('Failed to play saved feed dialogue.', error)
    })
  }
  const handleDelete = async (dialogueId: string) => {
    setDeleteError(null)

    try {
      await props.controller.onDeleteDialogue(dialogueId)
      setPendingDeleteId(null)
    } catch (error: unknown) {
      console.error('Failed to delete saved feed dialogue.', error)
      setDeleteError('피드 대화를 삭제하지 못했어요.')
    }
  }

  return (
    <>
      <div class="pomo-feed-settings__list-heading">
        <h4 id="pomo-feed-dialogues-title">피드 대화</h4>
        <span>{props.controller.dialogues().length}개</span>
        <button
          class="pomo-feed-settings__refresh"
          onClick={() => props.controller.syncNow()}
          type="button"
        >
          <span aria-hidden="true" class="i-tabler-refresh size-4" />
          지금 확인
        </button>
      </div>
      <Show
        when={props.controller.dialogues().length > 0}
        fallback={
          <p class="pomo-feed-settings__empty">
            아직 완성된 피드 대화가 없어요. 새 항목을 확인하면 자동으로 만들어요.
          </p>
        }
      >
        <ul aria-labelledby="pomo-feed-dialogues-title" class="pomo-feed-settings__dialogue-list">
          <For each={visibleDialogues()}>
            {(item) => (
              <li>
                <span class="pomo-feed-settings__dialogue-copy">
                  <strong>{item.metadata.itemTitle}</strong>
                  <small>
                    {item.metadata.sourceTitle} · {formatPublishedAt(item.metadata.publishedAt)} ·{' '}
                    <span
                      class="pomo-feed-settings__listened-state"
                      data-listened={item.metadata.listenedAt === null ? undefined : ''}
                    >
                      {item.metadata.listenedAt === null ? '안 들음' : '들음'}
                    </span>{' '}
                    · {formatRemaining(item.metadata.expiresAt)}
                  </small>
                </span>
                <span class="pomo-feed-settings__dialogue-actions">
                  <a href={item.metadata.sourceUrl} rel="noreferrer" target="_blank">
                    원문
                  </a>
                  <button onClick={() => handleListen(item.dialogue.id)} type="button">
                    {item.metadata.listenedAt === null ? '듣기' : '다시 듣기'}
                  </button>
                  <Show
                    when={pendingDeleteId() === item.dialogue.id}
                    fallback={
                      <button
                        aria-label={`${item.metadata.itemTitle} 피드 대화 삭제`}
                        onClick={() => {
                          setDeleteError(null)
                          setPendingDeleteId(item.dialogue.id)
                        }}
                        type="button"
                      >
                        삭제
                      </button>
                    }
                  >
                    <button onClick={() => setPendingDeleteId(null)} type="button">
                      취소
                    </button>
                    <button
                      aria-label={`${item.metadata.itemTitle} 피드 대화 삭제 확인`}
                      class="pomo-feed-settings__delete-confirm"
                      onClick={() => handleDelete(item.dialogue.id)}
                      type="button"
                    >
                      삭제 확인
                    </button>
                  </Show>
                </span>
              </li>
            )}
          </For>
        </ul>
        <Show when={hiddenDialogueCount() > 0}>
          <button
            class="pomo-feed-settings__load-more"
            onClick={() => setVisibleDialogueCount((count) => count + DIALOGUE_PAGE_SIZE)}
            type="button"
          >
            이전 피드 대화 {nextDialogueCount()}개 더 보기
          </button>
        </Show>
      </Show>
      <Show when={deleteError()}>
        {(message) => (
          <p aria-live="polite" class="pomo-feed-settings__message" role="status">
            {message()}
          </p>
        )}
      </Show>
      <Show when={props.controller.issues().length > 0}>
        <div class="pomo-feed-settings__issue-heading">
          <h4 id="pomo-feed-issues-title">읽지 못한 항목</h4>
          <span>{props.controller.issues().length}개</span>
        </div>
        <ul aria-labelledby="pomo-feed-issues-title" class="pomo-feed-settings__issue-list">
          <For each={props.controller.issues()}>
            {(item) => (
              <li>
                <span>
                  <strong>{item.itemTitle}</strong>
                  <small>{item.message}</small>
                </span>
                <a href={item.sourceUrl} rel="noreferrer" target="_blank">
                  원문 보기
                </a>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </>
  )
}
