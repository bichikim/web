import {useLocation} from '@solidjs/router'
import {type JSX, Show} from 'solid-js'

import {PEventProvider} from './PEventProvider'
import {PFeedProvider} from './PFeedProvider'
import {isPomoHomePath, usesPomoLayout} from './pomo-route'

export interface PFocusRoomLayoutProps {
  readonly children: JSX.Element
}

export const PFocusRoomLayout = (props: PFocusRoomLayoutProps) => {
  const location = useLocation()
  const isLayoutEnabled = () => usesPomoLayout(location.pathname)
  const isPlaybackEnabled = () => isPomoHomePath(location.pathname)

  return (
    <Show when={isLayoutEnabled()} fallback={props.children}>
      {/* AI_NOTE - This provider must outlive home/editor route swaps so one Pomo session owns one entry greeting. */}
      <PEventProvider isPlaybackEnabled={isPlaybackEnabled()}>
        <PFeedProvider>{props.children}</PFeedProvider>
      </PEventProvider>
    </Show>
  )
}
