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
import * as m from '@paraglide/message'
import {PFeedDialogueList} from './DialogueList'
import {RecommendedFeedItem} from './RecommendedItem'
import {CLASSES, RecommendedFeed} from './shared'

const getVoiceOptions = (): ReadonlyArray<PSelectOption<FeedVoiceId>> => [
  {label: m.settings_feed_default_voice(), value: DEFAULT_FEED_VOICE_ID},
  ...SUPERTONIC_VOICES.map((voice) => ({label: voice.label, value: voice.id})),
]
const getRecommendedPublicFeeds = () =>
  [
    {
      description: m.settings_feed_today_history_description(),
      id: 'pomo-today-in-history',
      label: m.settings_feed_today_history(),
      path: '/api/feeds/today-in-history/rss.xml',
    },
  ] as const
const getRecommendedDevFeeds = () =>
  [
    {
      description: m.settings_feed_dev_rss_description(),
      id: 'pomo-dev-rss',
      label: m.settings_feed_dev_rss(),
      path: '/__dev/feeds/rss.xml',
    },
    {
      description: m.settings_feed_dev_atom_description(),
      id: 'pomo-dev-atom',
      label: m.settings_feed_dev_atom(),
      path: '/__dev/feeds/atom.xml',
    },
  ] as const

export default function PFeedSettingsContent() {
  const feeds = useFeedConnections()
  const runtime = useOptionalPFeeds()
  const usesRemotePublicOrigin =
    import.meta.env.VITE_POMO_IS_APPS_IN_TOSS === 'true' ||
    import.meta.env.VITE_POMO_IS_DESKTOP === 'true'
  const publicOrigin = usesRemotePublicOrigin
    ? import.meta.env.VITE_POMO_PUBLIC_ORIGIN
    : window.location.origin
  const recommendedFeeds: ReadonlyArray<RecommendedFeed> = [
    ...getRecommendedPublicFeeds().map((feed) => ({
      ...feed,
      url: new URL(feed.path, publicOrigin).href,
    })),
    ...(import.meta.env.DEV
      ? getRecommendedDevFeeds().map((feed) => ({
          ...feed,
          url: new URL(feed.path, window.location.origin).href,
        }))
      : []),
  ]
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
            <span>{m.settings_feed_url()}</span>
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
            {m.settings_feed_add()}
          </button>
        </form>

        <div class={CLASSES.feedSettingsListHeading}>
          <h3 id="pomo-feed-list-title">{m.settings_feed_saved()}</h3>
          <span>{m.settings_count({count: feeds.connections().length})}</span>
        </div>

        <Show
          when={!feeds.isLoading()}
          fallback={<p class={CLASSES.feedSettingsStatus}>{m.settings_feed_loading()}</p>}
        >
          <Show when={feeds.connections().length > 0}>
            <ul aria-labelledby="pomo-feed-list-title" class={CLASSES.feedSettingsList}>
              <For each={feeds.connections()}>
                {(connection) => (
                  <li>
                    <div class={CLASSES.feedSettingsAddress}>
                      <span aria-hidden="true" class="i-tabler-rss size-5" />
                      <span class={CLASSES.feedSettingsAddressCopy}>
                        <strong>{connection.url}</strong>
                      </span>
                    </div>
                    <PSelect
                      accessibleLabel={m.settings_feed_voice_label({url: connection.url})}
                      hideLabel
                      label={m.settings_feed_voice()}
                      onChange={(voiceId) => feeds.onVoiceChange(connection.id, voiceId)}
                      options={getVoiceOptions()}
                      value={connection.voiceId}
                    />
                    <button
                      aria-label={m.settings_feed_delete_label({url: connection.url})}
                      class={CLASSES.feedSettingsDelete}
                      onClick={() => feeds.onDelete(connection.id)}
                      type="button"
                    >
                      <span aria-hidden="true" class="i-tabler-trash size-4" />
                      {m.settings_feed_delete()}
                    </button>
                  </li>
                )}
              </For>
            </ul>
          </Show>

          <Show when={availableRecommendations().length > 0}>
            <div class={CLASSES.feedSettingsRecommendationHeading}>
              <h4 id="pomo-feed-recommendations-title">{m.settings_feed_recommended()}</h4>
              <span>{m.settings_count({count: availableRecommendations().length})}</span>
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
