import {useTooltipTrigger} from '../tooltip'
import {cx} from 'class-variance-authority'
import * as m from '@paraglide/message'
import {PTooltip} from '../PTooltip'
import {POverflowMarquee} from '../POverflowMarquee'
import {CLASSES, type MusicPlayerViewProps} from './shared'

export const TrackSummary = (props: Pick<MusicPlayerViewProps, 'currentTrack'>) => {
  const tooltip = useTooltipTrigger()
  return (
    <div
      class={cx(CLASSES.playerTitle, 'relative min-w-0 flex-1 px-2 player-compact:px-1')}
      data-pomo-player-title=""
    >
      <p
        {...tooltip.events}
        ref={tooltip.setTarget}
        class={cx(CLASSES.playerTrackTitle, 'm-0 min-w-0')}
      >
        <POverflowMarquee text={props.currentTrack?.title ?? m.player_fallback_title()} />
      </p>
      <PTooltip
        target={tooltip.target()}
        show={tooltip.show()}
        text={props.currentTrack?.title ?? m.player_fallback_title()}
      />

      <p class={cx(CLASSES.playerTrackArtist, 'mb-0 mt-0.5 min-w-0')}>
        <POverflowMarquee text={props.currentTrack?.artist ?? m.player_fallback_artist()} />
      </p>
    </div>
  )
}
