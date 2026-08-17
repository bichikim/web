import {createMemo, createSignal, For, Show} from 'solid-js'

import type {PFeedController} from '../features/focus-room-feed'

const CLASSES = {
  feedSettingsDialogueActions: [
    'pomo-feed-settings__dialogue-actions flex flex-none gap-[0.4rem] [&_a]:inline-flex',
    '[&_a]:min-h-8 [&_a]:box-border [&_a]:cursor-pointer [&_a]:items-center',
    '[&_a]:[border:1px_solid_var(--pomo-border)] [&_a]:rounded-[var(--pomo-radius-control)]',
    '[&_a]:bg-transparent [&_a]:py-0 [&_a]:px-[var(--pomo-padding-md)]',
    '[&_a]:text-[var(--pomo-text)] [&_a]:[font:inherit] [&_a]:text-[0.68rem] [&_a]:font-bold',
    '[&_a]:no-underline [&_button]:inline-flex [&_button]:min-h-8 [&_button]:box-border',
    '[&_button]:cursor-pointer [&_button]:items-center',
    '[&_button]:[border:1px_solid_var(--pomo-border)]',
    '[&_button]:rounded-[var(--pomo-radius-control)] [&_button]:bg-transparent [&_button]:py-0',
    '[&_button]:px-[var(--pomo-padding-md)] [&_button]:text-[var(--pomo-text)]',
    '[&_button]:[font:inherit] [&_button]:text-[0.68rem] [&_button]:font-bold',
    '[&_button]:no-underline [&_a:hover]:border-[var(--pomo-brass)]',
    '[&_button:hover]:border-[var(--pomo-brass)]',
    '[&_[data-pomo-feed-delete-confirm]]:border-[rgb(232_174_114_/_58%)]',
    '[&_[data-pomo-feed-delete-confirm]]:text-[#ffd9bd]',
    '[&_[data-pomo-feed-delete-confirm]:hover]:border-[#ffd9bd]',
    '[&_[data-pomo-feed-delete-confirm]:hover]:bg-[rgb(232_174_114_/_12%)]',
    'pomo-below-[28rem]:w-full pomo-below-[28rem]:flex-wrap pomo-below-[28rem]:[&_a]:w-auto',
    'pomo-below-[28rem]:[&_a]:[flex:1_1_5rem] pomo-below-[28rem]:[&_a]:justify-center',
    'pomo-below-[28rem]:[&_button]:w-auto pomo-below-[28rem]:[&_button]:[flex:1_1_5rem]',
    'pomo-below-[28rem]:[&_button]:justify-center',
  ].join(' '),
  feedSettingsDialogueCopy: [
    'pomo-feed-settings__dialogue-copy grid min-w-0 flex-1 gap-[0.2rem]',
    '[&_strong]:overflow-hidden [&_strong]:text-[var(--pomo-text)] [&_strong]:text-xs',
    '[&_strong]:text-ellipsis [&_strong]:whitespace-nowrap',
    '[&_small]:text-[var(--pomo-text-muted)] [&_small]:text-[0.625rem] [&_small]:leading-[1.45]',
  ].join(' '),
  feedSettingsDialogueList: [
    'pomo-feed-settings__dialogue-list grid gap-[0.65rem] m-0 p-0 list-none [&_>_li]:flex',
    '[&_>_li]:items-center [&_>_li]:gap-3 [&_>_li]:[border:1px_solid_rgb(255_255_255_/_6%)]',
    '[&_>_li]:rounded-[var(--pomo-radius-panel)] [&_>_li]:bg-[rgb(255_255_255_/_3%)]',
    '[&_>_li]:p-[var(--pomo-padding-md)_var(--pomo-padding-lg)]',
    'pomo-below-[28rem]:[&_>_li]:items-stretch pomo-below-[28rem]:[&_>_li]:flex-col',
  ].join(' '),
  feedSettingsEmpty: [
    'pomo-feed-settings__empty m-0 rounded-[var(--pomo-radius-panel)] bg-[rgb(255_255_255_/_3%)]',
    'p-[var(--pomo-padding-xl)] text-[var(--pomo-text-muted)] text-xs leading-[1.5] text-center',
    '[border:1px_dashed_var(--pomo-border)]',
  ].join(' '),
  feedSettingsIssueHeading: [
    'pomo-feed-settings__issue-heading flex items-center gap-[0.45rem] [&_h4]:m-0',
    '[&_h4]:text-[var(--pomo-text)] [&_h4]:text-[0.8rem] [&_span]:text-[var(--pomo-text-muted)]',
    '[&_span]:text-[0.6875rem]',
  ].join(' '),
  feedSettingsIssueList: [
    'pomo-feed-settings__issue-list grid gap-[0.65rem] m-0 p-0 list-none [&_>_li]:flex',
    '[&_>_li]:items-center [&_>_li]:gap-3 [&_>_li]:[border:1px_solid_rgb(255_255_255_/_6%)]',
    '[&_>_li]:rounded-[var(--pomo-radius-panel)] [&_>_li]:bg-[rgb(255_255_255_/_3%)]',
    '[&_>_li]:p-[var(--pomo-padding-md)_var(--pomo-padding-lg)] [&_>_li_>_span]:grid',
    '[&_>_li_>_span]:min-w-0 [&_>_li_>_span]:flex-1 [&_>_li_>_span]:gap-[0.2rem]',
    '[&_strong]:overflow-hidden [&_strong]:text-[var(--pomo-text)] [&_strong]:text-xs',
    '[&_strong]:text-ellipsis [&_strong]:whitespace-nowrap',
    '[&_small]:text-[var(--pomo-text-muted)] [&_small]:text-[0.625rem] [&_small]:leading-[1.45]',
    '[&_a]:inline-flex [&_a]:min-h-8 [&_a]:box-border [&_a]:cursor-pointer [&_a]:items-center',
    '[&_a]:[border:1px_solid_var(--pomo-border)] [&_a]:rounded-[var(--pomo-radius-control)]',
    '[&_a]:bg-transparent [&_a]:py-0 [&_a]:px-[var(--pomo-padding-md)]',
    '[&_a]:text-[var(--pomo-text)] [&_a]:[font:inherit] [&_a]:text-[0.68rem] [&_a]:font-bold',
    '[&_a]:no-underline [&_a:hover]:border-[var(--pomo-brass)]',
    '[&_>_li]:border-[rgb(232_174_114_/_22%)] pomo-below-[28rem]:[&_>_li]:items-stretch',
    'pomo-below-[28rem]:[&_>_li]:flex-col pomo-below-[28rem]:[&_a]:w-full',
    'pomo-below-[28rem]:[&_a]:justify-center',
  ].join(' '),
  feedSettingsListenedState: [
    'pomo-feed-settings__listened-state text-[var(--pomo-brass)] font-bold',
    '[&[data-listened]]:text-[var(--pomo-text-muted)]',
  ].join(' '),
  feedSettingsListHeading: [
    'pomo-feed-settings__list-heading [&_h4]:m-0 [&_h4]:text-[var(--pomo-text)]',
    '[&_h4]:text-[0.9375rem] [&_h4]:font-[750] flex items-center gap-[0.45rem]',
    '[border-top:1px_solid_var(--pomo-border)] pt-[var(--pomo-padding-lg)]',
    '[&_>_span]:text-[var(--pomo-text-muted)] [&_>_span]:text-[0.6875rem]',
  ].join(' '),
  feedSettingsLoadMore: [
    'pomo-feed-settings__load-more min-h-9 cursor-pointer justify-self-center',
    '[border:1px_solid_var(--pomo-border)] rounded-[var(--pomo-radius-control)] bg-transparent',
    'py-0 px-[var(--pomo-padding-lg)] text-[var(--pomo-text-muted)] [font:inherit]',
    'text-[0.6875rem] font-bold [&:hover]:border-[var(--pomo-brass)]',
    '[&:hover]:text-[var(--pomo-text)] [&:focus-visible]:[outline:2px_solid_var(--pomo-brass)]',
    '[&:focus-visible]:[outline-offset:2px]',
  ].join(' '),
  feedSettingsMessage: [
    'pomo-feed-settings__message m-0 rounded-[var(--pomo-radius-panel)]',
    'bg-[rgb(255_255_255_/_3%)] p-[var(--pomo-padding-xl)] text-[var(--pomo-text-muted)] text-xs',
    'leading-[1.5] text-center',
  ].join(' '),
  feedSettingsRefresh: [
    'pomo-feed-settings__refresh inline-flex min-h-8 cursor-pointer items-center gap-[0.3rem]',
    'ml-auto [border:1px_solid_var(--pomo-border)] rounded-[var(--pomo-radius-control)]',
    'bg-transparent py-0 px-[var(--pomo-padding-md)] text-[var(--pomo-text-muted)] [font:inherit]',
    'text-[0.68rem] font-bold [&:hover]:border-[var(--pomo-brass)]',
    '[&:hover]:text-[var(--pomo-text)] [&:focus-visible]:[outline:2px_solid_var(--pomo-brass)]',
    '[&:focus-visible]:[outline-offset:2px]',
  ].join(' '),
} as const

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
      <div class={CLASSES.feedSettingsListHeading}>
        <h4 id="pomo-feed-dialogues-title">피드 대화</h4>
        <span>{props.controller.dialogues().length}개</span>
        <button
          class={CLASSES.feedSettingsRefresh}
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
          <p class={CLASSES.feedSettingsEmpty}>
            아직 완성된 피드 대화가 없어요. 새 항목을 확인하면 자동으로 만들어요.
          </p>
        }
      >
        <ul aria-labelledby="pomo-feed-dialogues-title" class={CLASSES.feedSettingsDialogueList}>
          <For each={visibleDialogues()}>
            {(item) => (
              <li>
                <span class={CLASSES.feedSettingsDialogueCopy}>
                  <strong>{item.metadata.itemTitle}</strong>
                  <small>
                    {item.metadata.sourceTitle} · {formatPublishedAt(item.metadata.publishedAt)} ·{' '}
                    <span
                      class={CLASSES.feedSettingsListenedState}
                      data-listened={item.metadata.listenedAt === null ? undefined : ''}
                    >
                      {item.metadata.listenedAt === null ? '안 들음' : '들음'}
                    </span>{' '}
                    · {formatRemaining(item.metadata.expiresAt)}
                  </small>
                </span>
                <span class={CLASSES.feedSettingsDialogueActions}>
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
                      data-pomo-feed-delete-confirm=""
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
            class={CLASSES.feedSettingsLoadMore}
            onClick={() => setVisibleDialogueCount((count) => count + DIALOGUE_PAGE_SIZE)}
            type="button"
          >
            이전 피드 대화 {nextDialogueCount()}개 더 보기
          </button>
        </Show>
      </Show>
      <Show when={deleteError()}>
        {(message) => (
          <p aria-live="polite" class={CLASSES.feedSettingsMessage} role="status">
            {message()}
          </p>
        )}
      </Show>
      <Show when={props.controller.issues().length > 0}>
        <div class={CLASSES.feedSettingsIssueHeading}>
          <h4 id="pomo-feed-issues-title">읽지 못한 항목</h4>
          <span>{props.controller.issues().length}개</span>
        </div>
        <ul aria-labelledby="pomo-feed-issues-title" class={CLASSES.feedSettingsIssueList}>
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
