import {type FeedConnectionController} from '../../features/focus-room-feed/index'
import {CLASSES, RecommendedFeed} from './shared'
import * as m from '@paraglide/message'
import {PSettingsActionButton} from '../settings/ActionButton'

interface RecommendedFeedItemProps {
  readonly feed: RecommendedFeed
  readonly onAdd: FeedConnectionController['onAddRecommendation']
}

export const RecommendedFeedItem = (props: RecommendedFeedItemProps) => {
  return (
    <li data-recommended>
      <div class={CLASSES.feedSettingsAddress}>
        <span aria-hidden="true" class="i-tabler-sparkles size-5" />
        <span class={CLASSES.feedSettingsAddressCopy}>
          <strong>{props.feed.label}</strong>
          <small>{props.feed.description}</small>
        </span>
      </div>
      <PSettingsActionButton
        accessibleLabel={m.settings_feed_recommendation_add_label({feed: props.feed.label})}
        class="pomo-feed-settings__add max-sm:w-full"
        icon="i-tabler-plus"
        onPress={() => props.onAdd(props.feed.url)}
        size="medium"
      >
        {m.settings_feed_add()}
      </PSettingsActionButton>
    </li>
  )
}
