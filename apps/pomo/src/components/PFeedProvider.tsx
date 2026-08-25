import {type JSX} from 'solid-js'

import {usePEvents} from '../features/focus-room-dialogue'
import {PFeedContext, usePFeeds} from '../features/focus-room-feed'

export interface PFeedProviderProps {
  readonly children: JSX.Element
}

export const PFeedProvider = (props: PFeedProviderProps) => {
  const events = usePEvents()
  const controller = usePFeeds({events})

  return <PFeedContext.Provider value={controller}>{props.children}</PFeedContext.Provider>
}
