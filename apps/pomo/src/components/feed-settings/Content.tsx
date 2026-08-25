import {Tabs} from '@kobalte/core/tabs'
import {createMemo, For, Show} from 'solid-js'

import {PSelect, type PSelectOption} from '../PSelect'
import {
  DEFAULT_FEED_VOICE_ID,
  type FeedVoiceId,
  useFeedConnections,
  useOptionalPFeeds,
} from '../../features/focus-room-feed'
import {SUPERTONIC_VOICES} from '../../features/supertonic'
import {PFeedDialogueList} from './DialogueList'
import {RecommendedFeedItem} from './RecommendedItem'
import {CLASSES, RecommendedFeed} from './shared'

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
