import {type JSX, onCleanup} from 'solid-js'

import {usePEvents} from '../features/focus-room-dialogue/event-context'
import type {PFeedController} from '../features/focus-room-feed/feed-controller'
import {PFeedContext} from '../features/focus-room-feed/feed-context'
import {usePFeeds} from '../features/focus-room-feed/use-focus-room-feeds'

export interface PFeedProviderProps {
  readonly children: JSX.Element
}

export const PFeedProvider = (props: PFeedProviderProps) => {
  const events = usePEvents()
  const controller = usePFeeds({events})
  let isDisposed = false
  onCleanup(() => {
    isDisposed = true
  })
  const context: PFeedController = {
    ...controller,
    retryRecovery: () => (isDisposed ? Promise.resolve() : controller.retryRecovery()),
  }

  return <PFeedContext.Provider value={context}>{props.children}</PFeedContext.Provider>
}
