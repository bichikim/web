import type {PSceneStyle} from 'src/features/focus-room-animation'
import type {usePFeedContext} from 'src/features/focus-room-feed'
import {PButton} from '../PButton'
import {FeedStatusSurface} from './Surface'
import {CLASSES} from './shared'
import * as m from '@paraglide/message'

interface FeedRecoveryNoticeProps {
  readonly feeds: ReturnType<typeof usePFeedContext>
  readonly actions: {
    readonly hasRetryError: () => boolean
    readonly isRetryDisabled: () => boolean
    readonly isCheckingModel: () => boolean
    readonly handleRetry: () => Promise<void>
    readonly handleDelete: () => void
  }
  readonly sceneStyle?: PSceneStyle
}
export const FeedRecoveryNotice = (props: FeedRecoveryNoticeProps) => {
  const hasPending = () => props.feeds.recoveryJobs().some((job) => job.status === 'pending')
  return (
    <FeedStatusSurface sceneStyle={props.sceneStyle} state="recovery">
      <span aria-hidden="true" class="i-tabler-refresh size-5" />
      <span class={CLASSES.feedStatusCopy}>
        <strong>
          {hasPending()
            ? m.feed_pending_count({count: props.feeds.recoveryJobs().length})
            : m.feed_incomplete_count({count: props.feeds.recoveryJobs().length})}
        </strong>
        <small>
          {props.actions.hasRetryError()
            ? m.feed_retry_failed()
            : hasPending()
              ? m.feed_prepare_description()
              : m.feed_retry_question()}
        </small>
      </span>
      <span class={CLASSES.feedStatusActions}>
        <PButton
          bordered
          transparent
          class={CLASSES.feedStatusAction}
          disabled={props.actions.isRetryDisabled()}
          onPress={props.actions.handleRetry}
          size="small"
          tone="secondary"
        >
          {props.actions.isCheckingModel()
            ? m.feed_checking()
            : hasPending()
              ? m.feed_prepare()
              : m.feed_retry()}
        </PButton>
        <PButton
          bordered
          transparent
          class={CLASSES.feedStatusAction}
          disabled={props.actions.isCheckingModel()}
          onPress={props.feeds.dismissRecovery}
          size="small"
          tone="secondary"
        >
          {m.feed_later()}
        </PButton>
        <PButton
          bordered
          transparent
          class={CLASSES.feedStatusAction}
          disabled={props.actions.isCheckingModel()}
          onPress={props.actions.handleDelete}
          size="small"
          tone="danger"
        >
          {m.feed_delete()}
        </PButton>
      </span>
    </FeedStatusSurface>
  )
}
