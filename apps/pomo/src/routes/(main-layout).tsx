import {useCurrentMatches, useLocation} from '@solidjs/router'
import type {ParentProps} from 'solid-js'

import {removeTrailingSlashes} from 'src/utils/remove-trailing-slashes'
import {PEventProvider} from 'src/components/p-event-provider/PEventProvider'
import {PFeedProvider} from 'src/components/p-feed-provider/PFeedProvider'

export default function MainLayout(props: ParentProps) {
  const matches = useCurrentMatches()
  const location = useLocation()
  const isPlaybackEnabled = () =>
    removeTrailingSlashes(location.pathname) === '/' ||
    matches().some((match) => match.route.info?.focusRoomPlayback === true)

  return (
    <PEventProvider isDelayedEndEventEnabled isPlaybackEnabled={isPlaybackEnabled()}>
      <PFeedProvider>{props.children}</PFeedProvider>
    </PEventProvider>
  )
}
