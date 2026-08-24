import {cx} from 'class-variance-authority'
import {PScribbleCircleControl} from '../PScribbleCircleControl'
import {PlayerIcon} from './Icon'
import {CLASSES, MusicPlayerViewProps} from './shared'

export const SummaryPlayButton = (
  props: Pick<MusicPlayerViewProps, 'currentTrack' | 'expanded' | 'sceneStyle'>,
) => (
  <div
    aria-hidden={props.expanded ? 'true' : undefined}
    class={cx(CLASSES.playerPlaySummaryFrame, props.expanded && 'is-hidden')}
  >
    <PScribbleCircleControl
      class="pomo-player__play-scribble-frame"
      enabled={props.sceneStyle === 'scribble'}
    >
      <media-play-button
        aria-label="재생 또는 일시 정지"
        class={cx(CLASSES.playerPlay, CLASSES.playerPlaySummary, 'shrink-0')}
        disabled={props.expanded || !props.currentTrack}
        notooltip
        tabindex={props.expanded ? -1 : 0}
        title="재생 또는 일시 정지"
      >
        <PlayerIcon
          icon="i-tabler-player-play"
          sceneStyle={props.sceneStyle}
          size="size-5"
          slot="play"
        />
        <PlayerIcon
          icon="i-tabler-player-pause"
          sceneStyle={props.sceneStyle}
          size="size-5"
          slot="pause"
        />
      </media-play-button>
    </PScribbleCircleControl>
  </div>
)
