import {useTooltipTrigger} from '../tooltip'
import {PTooltip} from '../p-tooltip/PTooltip'
import {cx} from 'class-variance-authority'
import {Show} from 'solid-js'
import * as m from '@paraglide/message'
import {PScribbleCircleControl} from '../scribble/CircleControl'
import {PlayerIcon} from './PlayerIcon'
import {CLASSES} from './styles'
import type {MusicPlayerViewProps} from './types'

export interface SummaryPlayButtonProps extends Pick<
  MusicPlayerViewProps,
  'currentTrack' | 'isPlaying' | 'sceneStyle'
> {
  readonly isPreparing?: boolean
  readonly onPause?: () => void
}

export const SummaryPlayButton = (props: SummaryPlayButtonProps) => {
  const tooltip = useTooltipTrigger()
  return (
    <div class={CLASSES.playerPlaySummaryFrame} data-player-play-summary-frame="">
      <PScribbleCircleControl enabled={props.sceneStyle === 'scribble'}>
        <Show
          when={props.isPreparing === true}
          fallback={
            <media-play-button
              ref={tooltip.setTarget}
              aria-label={props.isPlaying ? m.player_pause() : m.player_play()}
              class={cx(CLASSES.playerPlay, 'shrink-0')}
              disabled={props.currentTrack === undefined}
              onBlur={tooltip.onBlur}
              onFocus={tooltip.onFocus}
              onPointerDown={tooltip.onPointerDown}
              onPointerEnter={tooltip.onPointerEnter}
              onPointerLeave={tooltip.onPointerLeave}
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
          }
        >
          <button
            ref={tooltip.setTarget}
            aria-busy="true"
            aria-label={m.player_pause()}
            class={cx(
              CLASSES.playerPlay,
              'relative grid shrink-0 place-items-center rounded-full border-0 p-0',
            )}
            disabled={props.currentTrack === undefined || props.onPause === undefined}
            onBlur={tooltip.onBlur}
            onClick={() => props.onPause?.()}
            onFocus={tooltip.onFocus}
            onPointerDown={tooltip.onPointerDown}
            onPointerEnter={tooltip.onPointerEnter}
            onPointerLeave={tooltip.onPointerLeave}
            type="button"
          >
            <PlayerIcon icon="i-tabler-player-pause" sceneStyle={props.sceneStyle} size="size-6" />
          </button>
        </Show>
        <PTooltip
          target={tooltip.target()}
          show={tooltip.show()}
          text={
            props.isPreparing
              ? m.player_pause()
              : props.isPlaying
                ? m.player_pause()
                : m.player_play()
          }
        />
      </PScribbleCircleControl>
    </div>
  )
}
