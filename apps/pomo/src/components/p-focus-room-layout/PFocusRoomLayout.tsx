import {useLocation} from '@solidjs/router'
import {type JSX, Show} from 'solid-js'

import {PEventProvider} from '../p-event-provider/PEventProvider'
import {PFeedProvider} from '../p-feed-provider/PFeedProvider'
import {isPomoHomePath, usesPomoLayout} from '../pomo-route'
import {SoundEffectsProvider} from '../../features/sound-effects'

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
        <PFeedProvider>
          <Show when={isPlaybackEnabled()} fallback={props.children}>
            <SoundEffectsProvider>{props.children}</SoundEffectsProvider>
          </Show>
        </PFeedProvider>
      </PEventProvider>
    </Show>
  )
}
