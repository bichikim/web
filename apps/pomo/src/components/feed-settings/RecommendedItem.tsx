import {type FeedConnectionController} from '../../features/focus-room-feed/index'
import {CLASSES, RecommendedFeed} from './shared'

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
