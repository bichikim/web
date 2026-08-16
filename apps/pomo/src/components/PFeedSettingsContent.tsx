import {Tabs} from '@kobalte/core/tabs'
import {createMemo, For, Show} from 'solid-js'

import {PSelect, type PSelectOption} from '../design-system/PSelect'
import {
  DEFAULT_FEED_VOICE_ID,
  type FeedConnectionController,
  type FeedVoiceId,
  useFeedConnections,
  useOptionalPFeeds,
} from '../features/focus-room-feed'
import {SUPERTONIC_VOICES} from '../features/supertonic'
import {PFeedDialogueList} from './PFeedDialogueList'

const CLASSES = {
  feedSettings: 'pomo-feed-settings grid gap-4.5',
  feedSettingsAdd: [
    'pomo-feed-settings__add inline-flex h-[var(--pomo-control-height-medium)] box-border',
    'cursor-pointer items-center justify-center gap-[0.35rem]',
    '[border:1px_solid_var(--pomo-border)] rounded-[var(--pomo-radius-control)] bg-transparent',
    'py-0 px-[var(--pomo-padding-md)] text-[var(--pomo-text-muted)] [font:inherit] text-[0.7rem]',
    'font-bold',
    'transition-[border-color_140ms_ease,_background-color_140ms_ease,_color_140ms_ease]',
    'border-[var(--pomo-brass)] text-[var(--pomo-text)]',
    '[&:hover:not(:disabled)]:bg-[var(--pomo-secondary-soft)]',
    '[&:hover:not(:disabled)]:text-[var(--pomo-text)]',
    '[&:focus-visible]:[outline:2px_solid_var(--pomo-brass)]',
    '[&:focus-visible]:[outline-offset:2px] [&:disabled]:[cursor:not-allowed]',
    '[&:disabled]:[opacity:0.55] pomo-below-[28rem]:w-full motion-reduce:transition-[none]',
  ].join(' '),
  feedSettingsAddress: [
    'pomo-feed-settings__address flex min-w-0 min-h-10 items-center gap-[0.6rem]',
    'text-[var(--pomo-brass)] pomo-below-[42rem]:col-span-full',
  ].join(' '),
  feedSettingsAddressCopy: [
    'pomo-feed-settings__address-copy grid min-w-0 gap-[0.15rem] [&_strong]:overflow-hidden',
    '[&_strong]:text-ellipsis [&_small]:overflow-hidden [&_small]:text-ellipsis',
    '[&_strong]:text-[var(--pomo-text)] [&_strong]:text-xs [&_strong]:font-[650]',
    '[&_strong]:whitespace-nowrap [&_small]:text-[var(--pomo-text-muted)]',
    '[&_small]:text-[0.625rem] [&_small]:leading-[1.4]',
  ].join(' '),
  feedSettingsDelete: [
    'pomo-feed-settings__delete inline-flex h-[var(--pomo-control-height-medium)] box-border',
    'cursor-pointer items-center justify-center gap-[0.35rem]',
    '[border:1px_solid_var(--pomo-border)] rounded-[var(--pomo-radius-control)] bg-transparent',
    'py-0 px-[var(--pomo-padding-md)] text-[var(--pomo-text-muted)] [font:inherit] text-[0.7rem]',
    'font-bold',
    'transition-[border-color_140ms_ease,_background-color_140ms_ease,_color_140ms_ease] h-10',
    '[&:hover]:bg-[var(--pomo-secondary-soft)] [&:hover]:text-[var(--pomo-text)]',
    '[&:focus-visible]:[outline:2px_solid_var(--pomo-brass)]',
    '[&:focus-visible]:[outline-offset:2px] pomo-below-[28rem]:w-full',
    'motion-reduce:transition-[none]',
  ].join(' '),
  feedSettingsEmpty: [
    'pomo-feed-settings__empty m-0 rounded-[var(--pomo-radius-panel)] bg-[rgb(255_255_255_/_3%)]',
    'p-[var(--pomo-padding-xl)] text-[var(--pomo-text-muted)] text-xs leading-[1.5] text-center',
    '[border:1px_dashed_var(--pomo-border)]',
  ].join(' '),
  feedSettingsForm: [
    'pomo-feed-settings__form grid grid-cols-[minmax(0,_1fr)_auto] items-end gap-3',
    'pomo-below-[42rem]:grid-cols-[minmax(0,_1fr)_auto]',
    'pomo-below-[28rem]:grid-cols-[minmax(0,_1fr)]',
  ].join(' '),
  feedSettingsHeading: [
    'pomo-feed-settings__heading [&_h3]:m-0 [&_h3]:text-[var(--pomo-text)]',
    '[&_h3]:text-[0.9375rem] [&_h3]:font-[750] [&_p]:m-[0.25rem_0_0]',
    '[&_p]:text-[var(--pomo-text-muted)] [&_p]:text-[0.6875rem] [&_p]:leading-[1.5]',
  ].join(' '),
  feedSettingsList: [
    'pomo-feed-settings__list grid gap-3 m-0 p-0 list-none [&_>_li]:grid',
    '[&_>_li]:grid-cols-[minmax(0,_1fr)_minmax(8.5rem,_auto)_auto] [&_>_li]:items-end',
    '[&_>_li]:gap-3 [&_>_li]:[border:1px_solid_rgb(255_255_255_/_6%)]',
    '[&_>_li]:rounded-[var(--pomo-radius-panel)] [&_>_li]:bg-[rgb(255_255_255_/_3%)]',
    '[&_>_li]:p-[var(--pomo-padding-md)_var(--pomo-padding-lg)]',
    '[&_>_li[data-recommended]]:[border-style:dashed]',
    '[&_>_li[data-recommended]]:border-[rgb(214_181_133_/_28%)]',
    '[&_>_li[data-recommended]]:bg-[rgb(214_181_133_/_4%)]',
    'pomo-below-[42rem]:[&_>_li]:grid-cols-[minmax(0,_1fr)_auto]',
    'pomo-below-[28rem]:[&_>_li]:grid-cols-[minmax(0,_1fr)]',
  ].join(' '),
  feedSettingsListHeading: [
    'pomo-feed-settings__list-heading [&_h4]:m-0 [&_h4]:text-[var(--pomo-text)]',
    '[&_h4]:text-[0.9375rem] [&_h4]:font-[750] flex items-center gap-[0.45rem]',
    '[border-top:1px_solid_var(--pomo-border)] pt-[var(--pomo-padding-lg)]',
    '[&_>_span]:text-[var(--pomo-text-muted)] [&_>_span]:text-[0.6875rem]',
  ].join(' '),
  feedSettingsMessage: [
    'pomo-feed-settings__message m-0 rounded-[var(--pomo-radius-panel)]',
    'bg-[rgb(255_255_255_/_3%)] p-[var(--pomo-padding-xl)] text-[var(--pomo-text-muted)] text-xs',
    'leading-[1.5] text-center',
  ].join(' '),
  feedSettingsRecommendationHeading: [
    'pomo-feed-settings__recommendation-heading [&_h4]:m-0 [&_h4]:text-[var(--pomo-text)]',
    '[&_h4]:text-[0.9375rem] [&_h4]:font-[750] [&_>_span]:text-[var(--pomo-text-muted)]',
    '[&_>_span]:text-[0.6875rem] flex items-center gap-[0.45rem]',
  ].join(' '),
  feedSettingsStatus: [
    'pomo-feed-settings__status m-0 rounded-[var(--pomo-radius-panel)] bg-[rgb(255_255_255_/_3%)]',
    'p-[var(--pomo-padding-xl)] text-[var(--pomo-text-muted)] text-xs leading-[1.5] text-center',
  ].join(' '),
  feedSettingsUrlField: [
    'pomo-feed-settings__url-field grid min-w-0 gap-1.5 [&_>_span]:text-[var(--pomo-text-muted)]',
    '[&_>_span]:text-xs [&_>_span]:font-[650] [&_>_span]:leading-4 [&_input]:w-full',
    '[&_input]:h-[var(--pomo-control-height-medium)] [&_input]:box-border',
    '[&_input]:[border:1px_solid_var(--pomo-border)]',
    '[&_input]:rounded-[var(--pomo-radius-control)] [&_input]:bg-[var(--pomo-surface)]',
    '[&_input]:py-0 [&_input]:px-[var(--pomo-padding-lg)] [&_input]:text-[var(--pomo-text)]',
    '[&_input]:[font:inherit] [&_input]:text-[0.8125rem] [&_input]:outline-none',
    '[&_input]:transition-[border-color_160ms_ease,_background-color_160ms_ease]',
    '[&_input::placeholder]:text-[var(--pomo-text-muted)] [&_input::placeholder]:[opacity:0.7]',
    '[&_input:hover]:border-[var(--pomo-border-hover)]',
    '[&_input:focus-visible]:border-[var(--pomo-brass)]',
    '[&_input:focus-visible]:[outline:2px_solid_var(--pomo-brass)]',
    '[&_input:focus-visible]:[outline-offset:2px] pomo-below-[42rem]:col-span-full',
    'motion-reduce:[&_input]:transition-[none]',
  ].join(' '),
} as const

const VOICE_OPTIONS: ReadonlyArray<PSelectOption<FeedVoiceId>> = [
  {label: '기본값', value: DEFAULT_FEED_VOICE_ID},
  ...SUPERTONIC_VOICES.map((voice) => ({label: voice.label, value: voice.id})),
]
const RECOMMENDED_PUBLIC_FEEDS = [
  {
    description: '매일 오늘 있었던 역사적인 순간을 읽어 줘요.',
    id: 'pomo-today-in-history',
    label: '오늘의 역사',
    path: '/feeds/today-in-history/rss.xml',
  },
] as const
const RECOMMENDED_DEV_FEEDS = [
  {
    description: '5분마다 현재 시각으로 새 RSS 항목을 만들어요.',
    id: 'pomo-dev-rss',
    label: 'Pomo 5분 RSS',
    path: '/__dev/feeds/rss.xml',
  },
  {
    description: '5분마다 현재 시각으로 새 Atom 항목을 만들어요.',
    id: 'pomo-dev-atom',
    label: 'Pomo 5분 Atom',
    path: '/__dev/feeds/atom.xml',
  },
] as const

interface RecommendedFeed {
  readonly description: string
  readonly id: string
  readonly label: string
  readonly url: string
}

interface RecommendedFeedItemProps {
  readonly feed: RecommendedFeed
  readonly onAdd: FeedConnectionController['onAddRecommendation']
}

const RecommendedFeedItem = (props: RecommendedFeedItemProps) => {
  return (
    <li data-recommended>
      <div class={CLASSES.feedSettingsAddress}>
        <span aria-hidden="true" class="i-tabler-sparkles size-5" />
        <span class={CLASSES.feedSettingsAddressCopy}>
          <strong>{props.feed.label}</strong>
          <small>{props.feed.description}</small>
        </span>
      </div>
      <button
        aria-label={`${props.feed.label} 추천 피드 추가`}
        class={CLASSES.feedSettingsAdd}
        onClick={() => props.onAdd(props.feed.url)}
        type="button"
      >
        <span aria-hidden="true" class="i-tabler-plus size-4" />
        추가
      </button>
    </li>
  )
}

export default function PFeedSettingsContent() {
  const feeds = useFeedConnections()
  const runtime = useOptionalPFeeds()
  const recommendations = import.meta.env.DEV
    ? [...RECOMMENDED_PUBLIC_FEEDS, ...RECOMMENDED_DEV_FEEDS]
    : RECOMMENDED_PUBLIC_FEEDS
  const recommendedFeeds: ReadonlyArray<RecommendedFeed> = recommendations.map((feed) => ({
    ...feed,
    url: new URL(feed.path, window.location.origin).href,
  }))
  const availableRecommendations = createMemo(() => {
    const storedUrls = new Set(feeds.connections().map((connection) => connection.url))
    return recommendedFeeds.filter((feed) => !storedUrls.has(feed.url))
  })

  const handleSubmit = (event: SubmitEvent) => {
    event.preventDefault()
    feeds.onAdd()
  }

  return (
    <Tabs.Content value="feeds">
      <section class={CLASSES.feedSettings} aria-labelledby="pomo-feeds-title">
        <div class={CLASSES.feedSettingsHeading}>
          <h3 id="pomo-feeds-title">구독 피드</h3>
          <p>대화 탭의 공통 모델과 각 피드에 저장된 음성으로 새 글을 읽어 줘요.</p>
        </div>

        <form class={CLASSES.feedSettingsForm} onSubmit={handleSubmit}>
          <label class={CLASSES.feedSettingsUrlField} for="pomo-feed-url">
            <span>피드 주소</span>
            <input
              autocomplete="url"
              id="pomo-feed-url"
              inputmode="url"
              onInput={(event) => feeds.onDraftUrlChange(event.currentTarget.value)}
              placeholder="https://example.com/feed.xml"
              type="url"
              value={feeds.draftUrl()}
            />
          </label>
          <button class={CLASSES.feedSettingsAdd} disabled={feeds.isLoading()} type="submit">
            <span aria-hidden="true" class="i-tabler-plus size-4" />
            추가
          </button>
        </form>

        <div class={CLASSES.feedSettingsListHeading}>
          <h4 id="pomo-feed-list-title">저장된 피드</h4>
          <span>{feeds.connections().length}개</span>
        </div>

        <Show
          when={!feeds.isLoading()}
          fallback={<p class={CLASSES.feedSettingsStatus}>피드를 불러오는 중</p>}
        >
          <Show
            when={feeds.connections().length > 0}
            fallback={
              <Show when={availableRecommendations().length === 0}>
                <p class={CLASSES.feedSettingsEmpty}>
                  아직 저장된 피드가 없어요. 피드 주소를 추가해 주세요.
                </p>
              </Show>
            }
          >
            <ul aria-labelledby="pomo-feed-list-title" class={CLASSES.feedSettingsList}>
              <For each={feeds.connections()}>
                {(connection) => (
                  <li>
                    <div class={CLASSES.feedSettingsAddress}>
                      <span aria-hidden="true" class="i-tabler-rss size-5" />
                      <span class={CLASSES.feedSettingsAddressCopy}>
                        <strong title={connection.url}>{connection.url}</strong>
                      </span>
                    </div>
                    <PSelect
                      accessibleLabel={`${connection.url} 피드 음성`}
                      hideLabel
                      label="음성"
                      onChange={(voiceId) => feeds.onVoiceChange(connection.id, voiceId)}
                      options={VOICE_OPTIONS}
                      value={connection.voiceId}
                    />
                    <button
                      aria-label={`${connection.url} 피드 삭제`}
                      class={CLASSES.feedSettingsDelete}
                      onClick={() => feeds.onDelete(connection.id)}
                      type="button"
                    >
                      <span aria-hidden="true" class="i-tabler-trash size-4" />
                      삭제
                    </button>
                  </li>
                )}
              </For>
            </ul>
          </Show>

          <Show when={availableRecommendations().length > 0}>
            <div class={CLASSES.feedSettingsRecommendationHeading}>
              <h4 id="pomo-feed-recommendations-title">추천 피드</h4>
              <span>{availableRecommendations().length}개</span>
            </div>
            <ul aria-labelledby="pomo-feed-recommendations-title" class={CLASSES.feedSettingsList}>
              <For each={availableRecommendations()}>
                {(feed) => <RecommendedFeedItem feed={feed} onAdd={feeds.onAddRecommendation} />}
              </For>
            </ul>
          </Show>
        </Show>

        <Show when={feeds.message()}>
          {(message) => (
            <p aria-live="polite" class={CLASSES.feedSettingsMessage} role="status">
              {message()}
            </p>
          )}
        </Show>

        <Show when={runtime}>
          {(controller) => <PFeedDialogueList controller={controller()} />}
        </Show>
      </section>
    </Tabs.Content>
  )
}
