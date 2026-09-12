import {useTooltipTrigger} from '../tooltip'
import {PTooltip} from '../PTooltip'
import {cx} from 'class-variance-authority'
import * as m from '@paraglide/message'
import {PScribbleCircleControl} from '../scribble/CircleControl'
import {PlayerIcon} from './PlayerIcon'
import {CLASSES} from './styles'
import type {MusicPlayerViewProps} from './types'

export interface SummaryPlayButtonProps extends Pick<
  MusicPlayerViewProps,
  'currentTrack' | 'isPlaying' | 'sceneStyle'
> {}

export const SummaryPlayButton = (props: SummaryPlayButtonProps) => {
  const tooltip = useTooltipTrigger()
  return (
    <div class={CLASSES.playerPlaySummaryFrame}>
      <PScribbleCircleControl
        class="pomo-player__play-scribble-frame"
        enabled={props.sceneStyle === 'scribble'}
      >
        <media-play-button
          {...tooltip.events}
          ref={tooltip.setTarget}
          aria-label={props.isPlaying ? m.player_pause() : m.player_play()}
          class={cx(CLASSES.playerPlay, CLASSES.playerPlaySummary, 'shrink-0')}
          disabled={props.currentTrack === undefined}
          attr:notooltip=""
        >
          <PlayerIcon
            icon="i-tabler-player-play"
            sceneStyle={props.sceneStyle}
            size="size-6"
            slot="play"
          />
          <PlayerIcon
            icon="i-tabler-player-pause"
            sceneStyle={props.sceneStyle}
            size="size-6"
            slot="pause"
          />
        </media-play-button>
        <PTooltip
          target={tooltip.target()}
          show={tooltip.show()}
          text={props.isPlaying ? m.player_pause() : m.player_play()}
        />
      </PScribbleCircleControl>
    </div>
  )
}
