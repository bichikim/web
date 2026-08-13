import type {FocusRoomDialogue} from '../focus-room-dialogue'
import type {FeedDialogueMetadata, FeedItemRecord} from './feed-dialogue-schema'

const DEV_FEED_PATHS = new Set(['/__dev/feeds/atom.xml', '/__dev/feeds/rss.xml'])
const LEAKED_RSS_ID = 'pomo-dev-feed:'
const LEAKED_ATOM_ID = 'urn:pomo:dev-feed:'
const LEGACY_SELF_LINK_ERROR = '피드 항목이 원문 대신 피드 자체 주소를 가리키고 있어요.'

export interface IsMalformedDevFeedDialogueOptions {
  readonly dialogue: FocusRoomDialogue
  readonly metadata: FeedDialogueMetadata
}

/** Detects dialogue text created when a legacy dev-feed link was parsed as article HTML. */
export const isMalformedDevFeedDialogue = (options: IsMalformedDevFeedDialogueOptions) => {
  const sourcePath = new URL(options.metadata.sourceUrl).pathname

  if (!DEV_FEED_PATHS.has(sourcePath)) {
    return false
  }

  return (
    options.dialogue.text.includes(LEAKED_RSS_ID) || options.dialogue.text.includes(LEAKED_ATOM_ID)
  )
}

/** Detects temporary dev-feed failures created before the dev endpoint exposed full content. */
export const isLegacyDevFeedFailure = (item: FeedItemRecord) => {
  const sourcePath = new URL(item.sourceUrl).pathname
  return (
    DEV_FEED_PATHS.has(sourcePath) &&
    item.status === 'failed' &&
    item.message === LEGACY_SELF_LINK_ERROR
  )
}
