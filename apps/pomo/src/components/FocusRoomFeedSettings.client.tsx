import {Tabs} from '@kobalte/core/tabs'
import {createMemo, For, Show} from 'solid-js'

import {FocusRoomSelect, type FocusRoomSelectOption} from '../design-system/FocusRoomSelect'
import {
  DEFAULT_FEED_VOICE_ID,
  type FeedConnectionController,
  type FeedVoiceId,
  useFeedConnections,
  useOptionalFocusRoomFeeds,
} from '../features/focus-room-feed'
import {SUPERTONIC_VOICES} from '../features/supertonic'
import {FocusRoomFeedDialogueList} from './FocusRoomFeedDialogueList'
import './FocusRoomFeedSettings.css'

const VOICE_OPTIONS: ReadonlyArray<FocusRoomSelectOption<FeedVoiceId>> = [
  {label: '기본값', value: DEFAULT_FEED_VOICE_ID},
  ...SUPERTONIC_VOICES.map((voice) => ({label: voice.label, value: voice.id})),
]
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
      <div class="focus-room-feed-settings__address">
        <span aria-hidden="true" class="i-tabler-sparkles size-5" />
        <span class="focus-room-feed-settings__address-copy">
          <strong>{props.feed.label}</strong>
          <small>{props.feed.description}</small>
        </span>
      </div>
      <button
        aria-label={`${props.feed.label} 추천 피드 추가`}
        class="focus-room-feed-settings__add"
        onClick={() => props.onAdd(props.feed.url)}
        type="button"
      >
        <span aria-hidden="true" class="i-tabler-plus size-4" />
        추가
      </button>
    </li>
  )
}

export default function FocusRoomFeedSettingsClient() {
  const feeds = useFeedConnections()
  const runtime = useOptionalFocusRoomFeeds()
  const recommendedFeeds: ReadonlyArray<RecommendedFeed> = import.meta.env.DEV
    ? RECOMMENDED_DEV_FEEDS.map((feed) => ({
        ...feed,
        url: new URL(feed.path, window.location.origin).href,
      }))
    : []
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
      <section class="focus-room-feed-settings" aria-labelledby="focus-room-feeds-title">
        <div class="focus-room-feed-settings__heading">
          <h3 id="focus-room-feeds-title">구독 피드</h3>
          <p>대화 탭의 공통 모델과 각 피드에 저장된 음성으로 새 글을 읽어 줘요.</p>
        </div>

        <form class="focus-room-feed-settings__form" onSubmit={handleSubmit}>
          <label class="focus-room-feed-settings__url-field" for="focus-room-feed-url">
            <span>피드 주소</span>
            <input
              autocomplete="url"
              id="focus-room-feed-url"
              inputmode="url"
              onInput={(event) => feeds.onDraftUrlChange(event.currentTarget.value)}
              placeholder="https://example.com/feed.xml"
              type="url"
              value={feeds.draftUrl()}
            />
          </label>
          <button class="focus-room-feed-settings__add" disabled={feeds.isLoading()} type="submit">
            <span aria-hidden="true" class="i-tabler-plus size-4" />
            추가
          </button>
        </form>

        <div class="focus-room-feed-settings__list-heading">
          <h4 id="focus-room-feed-list-title">저장된 피드</h4>
          <span>{feeds.connections().length}개</span>
        </div>

        <Show
          when={!feeds.isLoading()}
          fallback={<p class="focus-room-feed-settings__status">피드를 불러오는 중</p>}
        >
          <Show
            when={feeds.connections().length > 0}
            fallback={
              <Show when={availableRecommendations().length === 0}>
                <p class="focus-room-feed-settings__empty">
                  아직 저장된 피드가 없어요. 피드 주소를 추가해 주세요.
                </p>
              </Show>
            }
          >
            <ul aria-labelledby="focus-room-feed-list-title" class="focus-room-feed-settings__list">
              <For each={feeds.connections()}>
                {(connection) => (
                  <li>
                    <div class="focus-room-feed-settings__address">
                      <span aria-hidden="true" class="i-tabler-rss size-5" />
                      <span class="focus-room-feed-settings__address-copy">
                        <strong title={connection.url}>{connection.url}</strong>
                      </span>
                    </div>
                    <FocusRoomSelect
                      accessibleLabel={`${connection.url} 피드 음성`}
                      hideLabel
                      label="음성"
                      onChange={(voiceId) => feeds.onVoiceChange(connection.id, voiceId)}
                      options={VOICE_OPTIONS}
                      value={connection.voiceId}
                    />
                    <button
                      aria-label={`${connection.url} 피드 삭제`}
                      class="focus-room-feed-settings__delete"
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
            <div class="focus-room-feed-settings__recommendation-heading">
              <h4 id="focus-room-feed-recommendations-title">추천 피드</h4>
              <span>개발용</span>
            </div>
            <ul
              aria-labelledby="focus-room-feed-recommendations-title"
              class="focus-room-feed-settings__list"
            >
              <For each={availableRecommendations()}>
                {(feed) => <RecommendedFeedItem feed={feed} onAdd={feeds.onAddRecommendation} />}
              </For>
            </ul>
          </Show>
        </Show>

        <Show when={feeds.message()}>
          {(message) => (
            <p aria-live="polite" class="focus-room-feed-settings__message" role="status">
              {message()}
            </p>
          )}
        </Show>

        <Show when={runtime}>
          {(controller) => <FocusRoomFeedDialogueList controller={controller()} />}
        </Show>
      </section>
    </Tabs.Content>
  )
}
