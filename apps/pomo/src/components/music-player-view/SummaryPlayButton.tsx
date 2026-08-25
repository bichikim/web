import {cx} from 'class-variance-authority'
import * as m from '@paraglide/message'
import {PScribbleCircleControl} from '../scribble/CircleControl'
import {PlayerIcon} from './Icon'
import {CLASSES, type MusicPlayerViewProps} from './shared'

export const SummaryPlayButton = (
  props: Pick<MusicPlayerViewProps, 'currentTrack' | 'sceneStyle'>,
) => (
  <div class={CLASSES.playerPlaySummaryFrame}>
    <PScribbleCircleControl
      class="pomo-player__play-scribble-frame"
      enabled={props.sceneStyle === 'scribble'}
    >
      <media-play-button
        aria-label={m.player_toggle_playback()}
        class={cx(CLASSES.playerPlay, CLASSES.playerPlaySummary, 'shrink-0')}
        disabled={!props.currentTrack}
        notooltip
        title={m.player_toggle_playback()}
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
