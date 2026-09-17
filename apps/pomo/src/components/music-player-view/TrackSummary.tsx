import {useTooltipTrigger} from '../tooltip'
import {cx} from 'class-variance-authority'
import * as m from '@paraglide/message'
import {Show} from 'solid-js'
import {PTooltip} from '../p-tooltip/PTooltip'
import {POverflowMarquee} from '../p-overflow-marquee/POverflowMarquee'
import {CLASSES} from './styles'
import type {MusicPlayerViewProps} from './types'

export interface TrackSummaryProps extends Pick<MusicPlayerViewProps, 'currentTrack'> {
  readonly isPreparing?: boolean
}

export const TrackSummary = (props: TrackSummaryProps) => {
  const tooltip = useTooltipTrigger()
  return (
    <div
      class={cx(CLASSES.playerTitle, 'relative min-w-0 flex-1 px-2 player-compact:px-1')}
      data-pomo-player-title=""
    >
      <p
        ref={tooltip.setTarget}
        class={cx(CLASSES.playerTrackTitle, 'm-0 min-w-0')}
        onBlur={tooltip.onBlur}
        onFocus={tooltip.onFocus}
        onPointerDown={tooltip.onPointerDown}
        onPointerEnter={tooltip.onPointerEnter}
        onPointerLeave={tooltip.onPointerLeave}
      >
        <POverflowMarquee text={props.currentTrack?.title ?? m.player_fallback_title()} />
      </p>
      <PTooltip
        target={tooltip.target()}
        show={tooltip.show()}
        text={props.currentTrack?.title ?? m.player_fallback_title()}
      />

      <Show
        when={props.isPreparing === true}
        fallback={
          <p class={cx(CLASSES.playerTrackArtist, 'mb-0 mt-0.5 min-w-0')}>
            <POverflowMarquee text={props.currentTrack?.artist ?? m.player_fallback_artist()} />
          </p>
        }
      >
        <p
          aria-busy="true"
          aria-live="polite"
          class={cx(CLASSES.playerTrackArtist, 'mb-0 mt-0.5 flex min-w-0 items-center gap-1.5')}
          data-player-status="preparing"
          role="status"
        >
          <span
            aria-hidden="true"
            class="i-tabler-loader-2 size-3.5 flex-none animate-spin motion-reduce:animate-none"
          />
          <span class="min-w-0 truncate">{m.player_next_track_preparing()}</span>
        </p>
      </Show>
    </div>
  )
}
