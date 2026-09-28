import {useCurrentMatches} from '@solidjs/router'
import type {ParentProps} from 'solid-js'

import {PEventProvider} from 'src/components/p-event-provider/PEventProvider'
import {PFeedProvider} from 'src/components/p-feed-provider/PFeedProvider'

export default function MainLayout(props: ParentProps) {
  const matches = useCurrentMatches()
  const isPlaybackEnabled = () =>
    matches().some((match) => match.route.info?.focusRoomPlayback === true)

  return (
    <PEventProvider isDelayedEndEventEnabled isPlaybackEnabled={isPlaybackEnabled()}>
      <PFeedProvider>{props.children}</PFeedProvider>
    </PEventProvider>
  )
}
