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
  feedSettings: 'pomo-feed-settings grid gap-4.5 settings-compact:gap-4',
  feedSettingsAdd: [
    'pomo-feed-settings__add inline-flex h-control-md box-border',
    'cursor-pointer items-center justify-center gap-[0.35rem]',
    'border border-solid border-border rounded-control bg-transparent',
    'py-0 px-3 text-muted-foreground [font:inherit] text-[0.7rem]',
    'font-bold',
    'transition-[border-color_140ms_ease,_background-color_140ms_ease,_color_140ms_ease]',
    'border-highlight text-foreground',
    '[&:hover:not(:disabled)]:bg-secondary-soft',
    '[&:hover:not(:disabled)]:text-foreground',
    '[&:focus-visible]:outline-2 [&:focus-visible]:outline-solid [&:focus-visible]:outline-highlight',
    '[&:focus-visible]:[outline-offset:2px] [&:disabled]:[cursor:not-allowed]',
    '[&:disabled]:[opacity:0.55] max-sm:w-full motion-reduce:transition-[none]',
  ].join(' '),
  feedSettingsAddress: [
    'pomo-feed-settings__address flex min-w-0 min-h-10 items-center gap-[0.6rem]',
    'text-highlight settings-compact:col-span-full',
  ].join(' '),
  feedSettingsAddressCopy: [
    'pomo-feed-settings__address-copy grid min-w-0 gap-[0.15rem] [&_strong]:overflow-hidden',
    '[&_strong]:text-ellipsis [&_small]:overflow-hidden [&_small]:text-ellipsis',
    '[&_strong]:text-foreground [&_strong]:text-xs [&_strong]:font-[650]',
    '[&_strong]:whitespace-nowrap [&_small]:text-muted-foreground',
    '[&_small]:text-[0.625rem] [&_small]:leading-[1.4]',
  ].join(' '),
  feedSettingsDelete: [
    'pomo-feed-settings__delete inline-flex h-control-md box-border',
    'cursor-pointer items-center justify-center gap-[0.35rem]',
    'border border-solid border-border rounded-control bg-transparent',
    'py-0 px-3 text-muted-foreground [font:inherit] text-[0.7rem]',
    'font-bold',
    'transition-[border-color_140ms_ease,_background-color_140ms_ease,_color_140ms_ease] h-10',
    '[&:hover]:bg-secondary-soft [&:hover]:text-foreground',
    '[&:focus-visible]:outline-2 [&:focus-visible]:outline-solid [&:focus-visible]:outline-highlight',
    '[&:focus-visible]:[outline-offset:2px] max-sm:w-full',
    'motion-reduce:transition-[none]',
  ].join(' '),
  feedSettingsEmpty: [
    'pomo-feed-settings__empty m-0 rounded-panel bg-[rgb(255_255_255_/_3%)]',
    'p-5 text-muted-foreground text-xs leading-[1.5] text-center settings-compact:p-4',
    'border border-dashed border-border',
  ].join(' '),
  feedSettingsForm: [
    'pomo-feed-settings__form grid grid-cols-[minmax(0,_1fr)_auto] items-end gap-3',
    'settings-compact:gap-2',
    'settings-compact:grid-cols-[minmax(0,_1fr)_auto]',
    'max-sm:grid-cols-[minmax(0,_1fr)]',
  ].join(' '),
  feedSettingsList: [
    'pomo-feed-settings__list grid gap-3 m-0 p-0 list-none [&_>_li]:grid',
    'settings-compact:gap-2 settings-compact:[&_>_li]:gap-2',
    '[&_>_li]:grid-cols-[minmax(0,_1fr)_minmax(8.5rem,_auto)_auto] [&_>_li]:items-end',
    '[&_>_li]:gap-3 [&_>_li]:[border:1px_solid_rgb(255_255_255_/_6%)]',
    '[&_>_li]:rounded-panel [&_>_li]:bg-[rgb(255_255_255_/_3%)]',
    '[&_>_li]:px-4 [&_>_li]:py-3',
    '[&_>_li[data-recommended]]:[border-style:dashed]',
    '[&_>_li[data-recommended]]:border-[rgb(214_181_133_/_28%)]',
    '[&_>_li[data-recommended]]:bg-[rgb(214_181_133_/_4%)]',
    'settings-compact:[&_>_li]:grid-cols-[minmax(0,_1fr)_auto]',
    'max-sm:[&_>_li]:grid-cols-[minmax(0,_1fr)]',
  ].join(' '),
  feedSettingsListHeading: [
    'pomo-feed-settings__list-heading [&_h3]:m-0 [&_h3]:text-foreground',
    '[&_h3]:text-[0.9375rem] [&_h3]:font-[750] flex items-center gap-[0.45rem]',
    'border-t border-solid border-border pt-4',
    '[&_>_span]:text-muted-foreground [&_>_span]:text-[0.6875rem]',
  ].join(' '),
  feedSettingsMessage: [
    'pomo-feed-settings__message m-0 rounded-panel',
    'bg-[rgb(255_255_255_/_3%)] p-5 text-muted-foreground text-xs settings-compact:p-4',
    'leading-[1.5] text-center',
  ].join(' '),
  feedSettingsRecommendationHeading: [
    'pomo-feed-settings__recommendation-heading [&_h4]:m-0 [&_h4]:text-foreground',
    '[&_h4]:text-[0.9375rem] [&_h4]:font-[750] [&_>_span]:text-muted-foreground',
    '[&_>_span]:text-[0.6875rem] flex items-center gap-[0.45rem]',
  ].join(' '),
  feedSettingsStatus: [
    'pomo-feed-settings__status m-0 rounded-panel bg-[rgb(255_255_255_/_3%)]',
    'p-5 text-muted-foreground text-xs leading-[1.5] text-center settings-compact:p-4',
  ].join(' '),
  feedSettingsUrlField: [
    'pomo-feed-settings__url-field grid min-w-0 gap-1.5 [&_>_span]:text-muted-foreground',
    '[&_>_span]:text-xs [&_>_span]:font-[650] [&_>_span]:leading-4 [&_input]:w-full',
    '[&_input]:h-control-md [&_input]:box-border',
    '[&_input]:border [&_input]:border-solid [&_input]:border-border',
    '[&_input]:rounded-control [&_input]:bg-surface',
    '[&_input]:py-0 [&_input]:px-4 [&_input]:text-foreground',
    '[&_input]:[font:inherit] [&_input]:text-[0.8125rem] [&_input]:outline-none',
    '[&_input]:transition-[border-color_160ms_ease,_background-color_160ms_ease]',
    '[&_input::placeholder]:text-muted-foreground [&_input::placeholder]:[opacity:0.7]',
    '[&_input:hover]:border-border-hover',
    '[&_input:focus-visible]:border-highlight',
    '[&_input:focus-visible]:outline-2 [&_input:focus-visible]:outline-solid ' +
      '[&_input:focus-visible]:outline-highlight',
    '[&_input:focus-visible]:[outline-offset:2px] settings-compact:col-span-full',
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
    path: '/api/feeds/today-in-history/rss.xml',
  },
] as const
const RECOMMENDED_DEV_FEEDS = [
  {
    description: '5분마다 현재 시각으로 새 RSS 항목을 만들어요.',
    id: 'pomo-dev-rss',
    label: 'Pomofi 5분 RSS',
    path: '/__dev/feeds/rss.xml',
  },
  {
    description: '5분마다 현재 시각으로 새 Atom 항목을 만들어요.',
    id: 'pomo-dev-atom',
    label: 'Pomofi 5분 Atom',
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
  const publicOrigin = import.meta.env.POMO_IS_APPS_IN_TOSS
    ? import.meta.env.POMO_PUBLIC_ORIGIN
    : window.location.origin
  const recommendations = import.meta.env.DEV
    ? [...RECOMMENDED_PUBLIC_FEEDS, ...RECOMMENDED_DEV_FEEDS]
    : RECOMMENDED_PUBLIC_FEEDS
  const recommendedFeeds: ReadonlyArray<RecommendedFeed> = recommendations.map((feed) => ({
    ...feed,
    url: new URL(feed.path, publicOrigin).href,
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
      <section class={CLASSES.feedSettings}>
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
          <h3 id="pomo-feed-list-title">저장된 피드</h3>
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
