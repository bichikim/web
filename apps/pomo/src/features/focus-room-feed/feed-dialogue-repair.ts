import type {PDialogue} from '../focus-room-dialogue'
import type {PDialogueRepository} from '../focus-room-dialogue/repository'
import type {FeedConnection} from './schema'
import type {FeedDialogueListItem} from './feed-controller'
import type {FeedDialogueRepository} from './feed-dialogue-repository'
import type {FeedDialogueMetadata, FeedItemRecord} from './feed-dialogue-schema'

const DEV_FEED_PATHS = new Set(['/__dev/feeds/atom.xml', '/__dev/feeds/rss.xml'])
const LEAKED_RSS_ID = 'pomo-dev-feed:'
const LEAKED_ATOM_ID = 'urn:pomo:dev-feed:'
const LEGACY_SELF_LINK_ERROR = '피드 항목이 원문 대신 피드 자체 주소를 가리키고 있어요.'

export interface IsMalformedDevFeedDialogueOptions {
  readonly dialogue: PDialogue
  readonly metadata: FeedDialogueMetadata
}

export interface RepairStoredDevFeedDialoguesOptions {
  readonly connections: ReadonlyArray<FeedConnection>
  readonly dialogueRepository: PDialogueRepository
  readonly feedRepository: FeedDialogueRepository
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

/** Removes dialogue and item records produced by obsolete development-feed formats. */
export const repairStoredDevFeedDialogues = async (
  options: RepairStoredDevFeedDialoguesOptions,
) => {
  const metadata = await options.feedRepository.listMetadata()
  const stored = await Promise.all(
    metadata.map(async (item) => ({
      dialogue: await options.dialogueRepository.getDialogue(item.dialogueId),
      metadata: item,
    })),
  )
  const malformed = stored.filter(
    (item): item is FeedDialogueListItem =>
      item.dialogue !== null &&
      isMalformedDevFeedDialogue({dialogue: item.dialogue, metadata: item.metadata}),
  )

  await Promise.all(
    malformed.map(async (item) => {
      await options.dialogueRepository.deleteDialogue(item.dialogue.id)
      await Promise.all([
        options.feedRepository.removeMetadata(item.dialogue.id),
        options.feedRepository.removeItem(item.metadata.feedConnectionId, item.metadata.feedItemId),
      ])
    }),
  )
  const itemGroups = await Promise.all(
    options.connections.map((connection) => options.feedRepository.listItems(connection.id)),
  )
  const legacyFailures = itemGroups.flat().filter(isLegacyDevFeedFailure)
  await Promise.all(
    legacyFailures.map((item) =>
      options.feedRepository.removeItem(item.feedConnectionId, item.feedItemId),
    ),
  )
  return malformed.length
}
