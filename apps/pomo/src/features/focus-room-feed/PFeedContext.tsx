import {createContext, type JSX, useContext} from 'solid-js'

import {usePEvents} from '../focus-room-dialogue'
import type {PFeedController} from './feed-controller'
import {usePFeeds} from './use-focus-room-feeds'

export interface PFeedProviderProps {
  readonly children: JSX.Element
}

const PFeedContext = createContext<PFeedController>()

export const PFeedProvider = (props: PFeedProviderProps) => {
  const events = usePEvents()
  const controller = usePFeeds({events})

  return <PFeedContext.Provider value={controller}>{props.children}</PFeedContext.Provider>
}

export const useOptionalPFeeds = () => useContext(PFeedContext)

export const usePFeedContext = () => {
  const context = useOptionalPFeeds()

  if (context === undefined) {
    throw new Error('usePFeedContext must be used inside PFeedProvider.')
  }

  return context
}
