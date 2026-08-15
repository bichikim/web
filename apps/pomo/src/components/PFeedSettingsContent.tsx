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
      <div class="pomo-feed-settings__address">
        <span aria-hidden="true" class="i-tabler-sparkles size-5" />
        <span class="pomo-feed-settings__address-copy">
          <strong>{props.feed.label}</strong>
          <small>{props.feed.description}</small>
        </span>
      </div>
      <button
        aria-label={`${props.feed.label} 추천 피드 추가`}
        class="pomo-feed-settings__add"
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
      <section class="pomo-feed-settings" aria-labelledby="pomo-feeds-title">
        <div class="pomo-feed-settings__heading">
          <h3 id="pomo-feeds-title">구독 피드</h3>
          <p>대화 탭의 공통 모델과 각 피드에 저장된 음성으로 새 글을 읽어 줘요.</p>
        </div>

        <form class="pomo-feed-settings__form" onSubmit={handleSubmit}>
          <label class="pomo-feed-settings__url-field" for="pomo-feed-url">
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
          <button class="pomo-feed-settings__add" disabled={feeds.isLoading()} type="submit">
            <span aria-hidden="true" class="i-tabler-plus size-4" />
            추가
          </button>
        </form>

        <div class="pomo-feed-settings__list-heading">
          <h4 id="pomo-feed-list-title">저장된 피드</h4>
          <span>{feeds.connections().length}개</span>
        </div>

        <Show
          when={!feeds.isLoading()}
          fallback={<p class="pomo-feed-settings__status">피드를 불러오는 중</p>}
        >
          <Show
            when={feeds.connections().length > 0}
            fallback={
              <Show when={availableRecommendations().length === 0}>
                <p class="pomo-feed-settings__empty">
                  아직 저장된 피드가 없어요. 피드 주소를 추가해 주세요.
                </p>
              </Show>
            }
          >
            <ul aria-labelledby="pomo-feed-list-title" class="pomo-feed-settings__list">
              <For each={feeds.connections()}>
                {(connection) => (
                  <li>
                    <div class="pomo-feed-settings__address">
                      <span aria-hidden="true" class="i-tabler-rss size-5" />
                      <span class="pomo-feed-settings__address-copy">
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
                      class="pomo-feed-settings__delete"
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
            <div class="pomo-feed-settings__recommendation-heading">
              <h4 id="pomo-feed-recommendations-title">추천 피드</h4>
              <span>{availableRecommendations().length}개</span>
            </div>
            <ul aria-labelledby="pomo-feed-recommendations-title" class="pomo-feed-settings__list">
              <For each={availableRecommendations()}>
                {(feed) => <RecommendedFeedItem feed={feed} onAdd={feeds.onAddRecommendation} />}
              </For>
            </ul>
          </Show>
        </Show>

        <Show when={feeds.message()}>
          {(message) => (
            <p aria-live="polite" class="pomo-feed-settings__message" role="status">
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
