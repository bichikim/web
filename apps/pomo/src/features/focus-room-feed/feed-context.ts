import {createContext, useContext} from 'solid-js'

import type {PFeedController} from './feed-controller'

export const PFeedContext = createContext<PFeedController>()

export const useOptionalPFeeds = () => useContext(PFeedContext)

export const usePFeedContext = () => {
  const context = useOptionalPFeeds()

  if (context === undefined) {
    throw new Error('usePFeedContext must be used inside PFeedProvider.')
  }

  return context
}
