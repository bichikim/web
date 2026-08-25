import {PScribblePanel} from '../scribble/Panel'
import {FeedStatusFrameProps} from './shared'

export const FeedStatusFrame = (props: FeedStatusFrameProps) => (
  <PScribblePanel
    class="pomo-feed-status-frame flex w-[min(36rem,_100%)]"
    enabled={props.sceneStyle === 'scribble'}
    frameClass="pomo-feed-status__scribble-border"
  >
    {props.children}
  </PScribblePanel>
)
