import {cx} from 'class-variance-authority'
import {type JSX, Show} from 'solid-js'

import {PButton} from '../design-system/PButton'
import type {PSceneStyle} from '../features/focus-room-animation'
import {usePFeedContext} from '../features/focus-room-feed'
import {PScribblePanel} from './PScribblePanel'

const CLASSES = {
  feedStatus: [
    'pomo-feed-status flex w-[min(36rem,_100%)] box-border items-center gap-3',
    'p-[0.8rem_0.9rem]',
    'text-foreground shadow-[inset_0_1px_0_rgb(255_255_255_/_8%)] pointer-events-auto',
    'backdrop-blur-[0.75rem] [-webkit-backdrop-filter:blur(0.75rem)]',
    "[&_>_[class*='i-tabler']]:flex-none [&_>_[class*='i-tabler']]:text-highlight",
    "feed-status-compact:[&[data-state='recovery']]:flex-wrap",
  ].join(' '),
  feedStatusAction: 'pomo-feed-status__action flex-none whitespace-nowrap',
  feedStatusActions: [
    'pomo-feed-status__actions flex flex-none gap-[0.35rem]',
    'feed-status-compact:w-full feed-status-compact:[&_button]:flex-1',
  ].join(' '),
  feedStatusCopy: [
    'pomo-feed-status__copy grid min-w-0 flex-1 gap-[0.15rem] [&_strong]:overflow-hidden',
    '[&_strong]:text-ellipsis [&_strong]:whitespace-nowrap [&_small]:overflow-hidden',
    '[&_small]:text-ellipsis [&_small]:whitespace-nowrap [&_strong]:text-[0.78rem]',
    '[&_small]:text-muted-foreground [&_small]:text-[0.68rem]',
  ].join(' '),
  feedStatusSpinner: [
    'pomo-feed-status__spinner w-4 h-4 box-border flex-none',
    'animate-spin [border:2px_solid_rgb(255_255_255_/_24%)]',
    'border-t-highlight rounded-full motion-reduce:animate-[none]',
  ].join(' '),
} as const

interface PFeedStatusProps {
  readonly sceneStyle?: PSceneStyle
}

interface FeedStatusFrameProps {
  readonly children: JSX.Element
  readonly sceneStyle?: PSceneStyle
}

interface FeedStatusSurfaceProps extends FeedStatusFrameProps {
  readonly state: string
}

const getFeedStatusShapeClasses = (sceneStyle?: PSceneStyle) =>
  sceneStyle === 'scribble' ? 'rounded-none border-0' : 'rounded-2xl border border-solid'

const FeedStatusFrame = (props: FeedStatusFrameProps) => (
  <PScribblePanel
    class="pomo-feed-status-frame flex w-[min(36rem,_100%)]"
    enabled={props.sceneStyle === 'scribble'}
    frameClass="pomo-feed-status__scribble-border"
  >
    {props.children}
  </PScribblePanel>
)

const FeedStatusSurface = (props: FeedStatusSurfaceProps) => (
  <FeedStatusFrame sceneStyle={props.sceneStyle}>
    <div
      aria-live="polite"
      class={cx(
        CLASSES.feedStatus,
        getFeedStatusShapeClasses(props.sceneStyle),
        'border-highlight bg-surface-interactive',
      )}
      data-state={props.state}
      role="status"
    >
      {props.children}
    </div>
  </FeedStatusFrame>
)

export const PFeedStatus = (props: PFeedStatusProps) => {
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
              onPress={handleRetry}
              size="small"
              tone="secondary"
            >
              다시 만들기
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
  )
}
