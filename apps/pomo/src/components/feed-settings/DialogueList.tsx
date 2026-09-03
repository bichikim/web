import {cx} from 'class-variance-authority'
import {createMemo, createSignal, For, Show} from 'solid-js'

import type {PFeedController} from '../../features/focus-room-feed'
import * as m from '@paraglide/message'
import {getLocale} from '@paraglide/runtime'

interface FeedIssueMessageSource {
  readonly contentLength: number
  readonly status: string
}

const getFeedIssueMessage = (item: FeedIssueMessageSource) =>
  item.status === 'too-long'
    ? m.settings_feed_issue_too_long({count: item.contentLength})
    : m.settings_feed_issue_failed()

const CLASSES = {
  feedSettingsDialogueActions: cx(
    'pomo-feed-settings__dialogue-actions flex flex-none gap-[0.4rem]',
    '[&_button]:inline-flex [&_button]:min-h-8 [&_button]:box-border',
    '[&_button]:cursor-pointer [&_button]:items-center',
    '[&_button]:border [&_button]:border-solid [&_button]:border-border',
    '[&_button]:rounded-control [&_button]:bg-transparent [&_button]:py-0',
    '[&_button]:px-3 [&_button]:text-foreground',
    '[&_button]:[font:inherit] [&_button]:text-[0.68rem] [&_button]:font-bold',
    '[&_button]:no-underline [&_button:hover]:border-highlight',
    '[&_[data-pomo-feed-delete-confirm]]:border-[rgb(232_174_114_/_58%)]',
    '[&_[data-pomo-feed-delete-confirm]]:text-[#ffd9bd]',
    '[&_[data-pomo-feed-delete-confirm]:hover]:border-[#ffd9bd]',
    '[&_[data-pomo-feed-delete-confirm]:hover]:bg-[rgb(232_174_114_/_12%)]',
    'max-sm:w-full max-sm:flex-wrap',
    'max-sm:[&_button]:w-auto max-sm:[&_button]:[flex:1_1_5rem]',
    'max-sm:[&_button]:justify-center',
  ),
  feedSettingsDialogueCopy: cx(
    'pomo-feed-settings__dialogue-copy grid min-w-0 flex-1 gap-[0.2rem]',
    '[&_strong]:overflow-hidden [&_strong]:text-foreground [&_strong]:text-xs',
    '[&_strong]:text-ellipsis [&_strong]:whitespace-nowrap',
    '[&_small]:text-muted-foreground [&_small]:text-[0.625rem] [&_small]:leading-[1.45]',
  ),
  feedSettingsDialogueList: cx(
    'pomo-feed-settings__dialogue-list grid gap-[0.65rem] m-0 p-0 list-none [&_>_li]:flex',
    'settings-compact:gap-2 settings-compact:[&_>_li]:gap-2',
    '[&_>_li]:items-center [&_>_li]:gap-3 [&_>_li]:[border:0.0625rem_solid_rgb(255_255_255_/_6%)]',
    '[&_>_li]:rounded-panel [&_>_li]:bg-[rgb(255_255_255_/_3%)]',
    '[&_>_li]:px-4 [&_>_li]:py-3',
    'max-sm:[&_>_li]:items-stretch max-sm:[&_>_li]:flex-col',
  ),
  feedSettingsEmpty: cx(
    'pomo-feed-settings__empty m-0 rounded-panel bg-[rgb(255_255_255_/_3%)]',
    'p-5 text-muted-foreground text-xs leading-[1.5] text-center settings-compact:p-4',
    'border border-dashed border-border',
  ),
  feedSettingsIssueHeading: cx(
    'pomo-feed-settings__issue-heading flex items-center gap-[0.45rem] [&_h4]:m-0',
    '[&_h4]:text-foreground [&_h4]:text-[0.8rem] [&_span]:text-muted-foreground',
    '[&_span]:text-[0.6875rem]',
  ),
  feedSettingsIssueList: cx(
    'pomo-feed-settings__issue-list grid gap-[0.65rem] m-0 p-0 list-none [&_>_li]:flex',
    'settings-compact:gap-2 settings-compact:[&_>_li]:gap-2',
    '[&_>_li]:items-center [&_>_li]:gap-3 [&_>_li]:[border:0.0625rem_solid_rgb(255_255_255_/_6%)]',
    '[&_>_li]:rounded-panel [&_>_li]:bg-[rgb(255_255_255_/_3%)]',
    '[&_>_li]:px-4 [&_>_li]:py-3 [&_>_li_>_span]:grid',
    '[&_>_li_>_span]:min-w-0 [&_>_li_>_span]:flex-1 [&_>_li_>_span]:gap-[0.2rem]',
    '[&_strong]:overflow-hidden [&_strong]:text-foreground [&_strong]:text-xs',
    '[&_strong]:text-ellipsis [&_strong]:whitespace-nowrap',
    '[&_small]:text-muted-foreground [&_small]:text-[0.625rem] [&_small]:leading-[1.45]',
    '[&_a]:inline-flex [&_a]:min-h-8 [&_a]:box-border [&_a]:cursor-pointer [&_a]:items-center',
    '[&_a]:border [&_a]:border-solid [&_a]:border-border [&_a]:rounded-control',
    '[&_a]:bg-transparent [&_a]:py-0 [&_a]:px-3',
    '[&_a]:text-foreground [&_a]:[font:inherit] [&_a]:text-[0.68rem] [&_a]:font-bold',
    '[&_a]:no-underline [&_a:hover]:border-highlight',
    '[&_>_li]:border-[rgb(232_174_114_/_22%)] max-sm:[&_>_li]:items-stretch',
    'max-sm:[&_>_li]:flex-col max-sm:[&_a]:w-full',
    'max-sm:[&_a]:justify-center',
  ),
  feedSettingsListenedState: cx(
    'pomo-feed-settings__listened-state text-highlight font-bold',
    '[&[data-listened]]:text-muted-foreground',
  ),
  feedSettingsListHeading: cx(
    'pomo-feed-settings__list-heading [&_h4]:m-0 [&_h4]:text-foreground',
    '[&_h4]:text-[0.9375rem] [&_h4]:font-[750] flex items-center gap-[0.45rem]',
    'border-t border-solid border-border pt-4',
    '[&_>_span]:text-muted-foreground [&_>_span]:text-[0.6875rem]',
  ),
  feedSettingsLoadMore: cx(
    'pomo-feed-settings__load-more min-h-9 cursor-pointer justify-self-center',
    'border border-solid border-border rounded-control bg-transparent',
    'py-0 px-4 text-muted-foreground [font:inherit]',
    'text-[0.6875rem] font-bold [&:hover]:border-highlight',
    '[&:hover]:text-foreground [&:focus-visible]:outline-2 ' +
      '[&:focus-visible]:outline-solid [&:focus-visible]:outline-highlight',
    '[&:focus-visible]:[outline-offset:0.125rem]',
  ),
  feedSettingsMessage: cx(
    'pomo-feed-settings__message m-0 rounded-panel',
    'bg-[rgb(255_255_255_/_3%)] p-5 text-muted-foreground text-xs settings-compact:p-4',
    'leading-[1.5] text-center',
  ),
  feedSettingsRefresh: cx(
    'pomo-feed-settings__refresh inline-flex min-h-8 cursor-pointer items-center gap-[0.3rem]',
    'ml-auto border border-solid border-border rounded-control',
    'bg-transparent py-0 px-3 text-muted-foreground [font:inherit]',
    'text-[0.68rem] font-bold [&:hover]:border-highlight',
    '[&:hover]:text-foreground [&:focus-visible]:outline-2 ' +
      '[&:focus-visible]:outline-solid [&:focus-visible]:outline-highlight',
    '[&:focus-visible]:[outline-offset:0.125rem]',
  ),
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
  new Intl.DateTimeFormat(getLocale() === 'ko' ? 'ko-KR' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))

const formatRemaining = (value: string) => {
  const hours = Math.max(0, Math.ceil((Date.parse(value) - Date.now()) / HOUR_MS))
  return hours === 0 ? m.settings_feed_cleanup_next() : m.settings_feed_cleanup_hours({hours})
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
      setDeleteError(m.settings_feed_dialogue_delete_failed())
    }
  }

  return (
    <>
      <div class={CLASSES.feedSettingsListHeading}>
        <h4 id="pomo-feed-dialogues-title">{m.settings_feed_dialogues()}</h4>
        <span>{m.settings_count({count: props.controller.dialogues().length})}</span>
        <button
          class={CLASSES.feedSettingsRefresh}
          onClick={() => props.controller.syncNow()}
          type="button"
        >
          <span aria-hidden="true" class="i-tabler-refresh size-4" />
          {m.settings_feed_check_now()}
        </button>
      </div>
      <Show
        when={props.controller.dialogues().length > 0}
        fallback={<p class={CLASSES.feedSettingsEmpty}>{m.settings_feed_empty()}</p>}
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
                      {item.metadata.listenedAt === null
                        ? m.settings_feed_not_listened()
                        : m.settings_feed_listened()}
                    </span>{' '}
                    · {formatRemaining(item.metadata.expiresAt)}
                  </small>
                </span>
                <span class={CLASSES.feedSettingsDialogueActions}>
                  <button onClick={() => handleListen(item.dialogue.id)} type="button">
                    {item.metadata.listenedAt === null
                      ? m.settings_feed_listen()
                      : m.settings_feed_listen_again()}
                  </button>
                  <Show
                    when={pendingDeleteId() === item.dialogue.id}
                    fallback={
                      <button
                        aria-label={m.settings_feed_dialogue_delete_label({
                          title: item.metadata.itemTitle,
                        })}
                        onClick={() => {
                          setDeleteError(null)
                          setPendingDeleteId(item.dialogue.id)
                        }}
                        type="button"
                      >
                        {m.settings_feed_delete()}
                      </button>
                    }
                  >
                    <button onClick={() => setPendingDeleteId(null)} type="button">
                      {m.settings_feed_cancel()}
                    </button>
                    <button
                      aria-label={m.settings_feed_dialogue_delete_confirm_label({
                        title: item.metadata.itemTitle,
                      })}
                      class="pomo-feed-settings__delete-confirm"
                      data-pomo-feed-delete-confirm=""
                      onClick={() => handleDelete(item.dialogue.id)}
                      type="button"
                    >
                      {m.settings_feed_delete_confirm()}
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
            {m.settings_feed_load_more({count: nextDialogueCount()})}
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
          <h4 id="pomo-feed-issues-title">{m.settings_feed_issues()}</h4>
          <span>{m.settings_count({count: props.controller.issues().length})}</span>
        </div>
        <ul aria-labelledby="pomo-feed-issues-title" class={CLASSES.feedSettingsIssueList}>
          <For each={props.controller.issues()}>
            {(item) => (
              <li>
                <span>
                  <strong>{item.itemTitle}</strong>
                  <small>{getFeedIssueMessage(item)}</small>
                </span>
                <a href={item.sourceUrl} rel="noreferrer" target="_blank">
                  {m.settings_feed_open_source()}
                </a>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </>
  )
}
