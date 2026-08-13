import {createContext, type JSX, useContext} from 'solid-js'

import {useFocusRoomEvents} from '../focus-room-dialogue'
import type {FocusRoomFeedController} from './feed-controller'
import {useFocusRoomFeeds} from './use-focus-room-feeds'

export interface FocusRoomFeedProviderProps {
  readonly children: JSX.Element
}

const FocusRoomFeedContext = createContext<FocusRoomFeedController>()

export const FocusRoomFeedProvider = (props: FocusRoomFeedProviderProps) => {
  const events = useFocusRoomEvents()
  const controller = useFocusRoomFeeds({events})

  return (
    <FocusRoomFeedContext.Provider value={controller}>
      {props.children}
    </FocusRoomFeedContext.Provider>
  )
}

export const useOptionalFocusRoomFeeds = () => useContext(FocusRoomFeedContext)

export const useFocusRoomFeedContext = () => {
  const context = useOptionalFocusRoomFeeds()

  if (context === undefined) {
    throw new Error('useFocusRoomFeedContext must be used inside FocusRoomFeedProvider.')
  }

  return context
}
