import {useFeedProgress} from '../feed-status/use-feed-progress'
import {Show} from 'solid-js'
import type {PFeedController} from 'src/features/focus-room-feed'
import {useModelDownload} from 'src/features/model-download'
import * as m from '@paraglide/message'
import {FeedGenerationStatus} from '../feed-status/FeedGenerationStatus'

interface PFeedProgressProps {
  readonly controller: PFeedController
}

export const PFeedProgress = (props: PFeedProgressProps) => {
  const activity = useFeedProgress(() => props.controller, useModelDownload())
  return (
    <>
      <Show when={activity.progress()}>
        {(state) => (
          <div class="border-t border-solid border-border pt-4">
            <FeedGenerationStatus
              respectVisibilityPreference={false}
              cancelDisabled={activity.stopping()}
              onCancel={activity.handleStop}
              state={state().status}
              message={
                <>
                  {activity.stopping() ? m.feed_stopping() : state().message}
                  <Show when={state().progress !== null}> · {state().progress}%</Show>
                </>
              }
            />
          </div>
        )}
      </Show>
      <Show when={activity.error()}>
        {(message) => (
          <p class="m-0 text-sm text-danger" role="alert">
            {message()}
          </p>
        )}
      </Show>
    </>
  )
}
