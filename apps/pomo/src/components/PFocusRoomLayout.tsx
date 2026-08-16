import {useLocation} from '@solidjs/router'
import {type JSX, Show} from 'solid-js'

import {PEventProvider} from '../features/focus-room-dialogue/PEventContext'
import {PFeedProvider} from '../features/focus-room-feed'

const FOCUS_ROOM_LAYOUT_PATHS: ReadonlySet<string> = new Set([
  '/',
  '/focus-room',
  '/focus-room-dialogue',
])

export interface PFocusRoomLayoutProps {
  readonly children: JSX.Element
}

export const PFocusRoomLayout = (props: PFocusRoomLayoutProps) => {
  const location = useLocation()
  const usesFocusRoomLayout = () => FOCUS_ROOM_LAYOUT_PATHS.has(location.pathname)
  const isPlaybackEnabled = () => location.pathname === '/'

  return (
    <Show when={usesFocusRoomLayout()} fallback={props.children}>
      {/* AI_NOTE - This provider must outlive home/editor route swaps so one room session owns one entry greeting. */}
      <PEventProvider isPlaybackEnabled={isPlaybackEnabled()}>
        <PFeedProvider>{props.children}</PFeedProvider>
      </PEventProvider>
    </Show>
  )
}
