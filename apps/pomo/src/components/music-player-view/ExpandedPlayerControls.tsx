import type {JSX} from 'solid-js'
import {useTooltipTrigger} from '../tooltip'
import {PTooltip} from '../PTooltip'
import {cx} from 'class-variance-authority'
import * as m from '@paraglide/message'
import {PPlaybackModes} from './PPlaybackModes'
import {PScribbleCircleControl} from '../scribble/CircleControl'
import {PlayerIcon} from './PlayerIcon'
import {CLASSES} from './styles'
import type {MusicPlayerViewProps} from './types'
import {VolumeControl} from './VolumeControl'

const SKIP_BUTTON_CLASSES = cx(
  'pomo-player__skip grid size-10 shrink-0 place-items-center rounded-full transition',
  'disabled:opacity-35 player-compact:size-9',
)

interface ExpandedPlayerControlsProps extends Pick<
  MusicPlayerViewProps,
  | 'isPlaying'
  | 'onNextTrack'
  | 'onPreviousTrack'
  | 'onRepeatModeChange'
  | 'onShuffleChange'
  | 'repeatMode'
  | 'sceneStyle'
  | 'shuffleEnabled'
> {
  readonly canSkip: boolean
  readonly hasTrack: boolean
  readonly actions?: JSX.Element
}

export const ExpandedPlayerControls = (props: ExpandedPlayerControlsProps) => {
  const previousTooltip = useTooltipTrigger()
  const playTooltip = useTooltipTrigger()
  const nextTooltip = useTooltipTrigger()
  return (
    <div
      class={cx(
        'pomo-player__expanded-controls grid min-w-0 flex-none grid-cols-[1fr_auto_1fr]',
        'items-center gap-2 px-1',
        'player-compact:grid-cols-[max-content_max-content_max-content]',
        'player-compact:justify-evenly',
        'player-compact:gap-1',
      )}
    >
      <div class="min-w-0">
        <PPlaybackModes
          onRepeatModeChange={props.onRepeatModeChange}
          onShuffleChange={props.onShuffleChange}
          repeatMode={props.repeatMode}
          sceneStyle={props.sceneStyle}
          shuffleEnabled={props.shuffleEnabled}
        />
      </div>

      <div class="pomo-player__transport flex items-center justify-center gap-1">
        <button
          {...previousTooltip.events}
          ref={previousTooltip.setTarget}
          aria-label={m.player_previous()}
          class={SKIP_BUTTON_CLASSES}
          disabled={!props.canSkip}
          onClick={() => props.onPreviousTrack()}
          type="button"
        >
          <PlayerIcon
            icon="i-tabler-player-track-prev"
            sceneStyle={props.sceneStyle}
            size="size-6"
          />
        </button>
        <PTooltip
          target={previousTooltip.target()}
          show={previousTooltip.show()}
          text={m.player_previous()}
        />

        <PScribbleCircleControl
          class="pomo-player__play-scribble-frame pomo-player__transport-play-frame
            player-compact:hidden"
          enabled={props.sceneStyle === 'scribble'}
        >
          <media-play-button
            {...playTooltip.events}
            ref={playTooltip.setTarget}
            aria-label={props.isPlaying ? m.player_pause() : m.player_play()}
            class={cx(CLASSES.playerPlay, CLASSES.playerPlayLarge)}
            disabled={!props.hasTrack}
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
            target={playTooltip.target()}
            show={playTooltip.show()}
            text={props.isPlaying ? m.player_pause() : m.player_play()}
          />
        </PScribbleCircleControl>

        <button
          {...nextTooltip.events}
          ref={nextTooltip.setTarget}
          aria-label={m.player_next()}
          class={SKIP_BUTTON_CLASSES}
          disabled={!props.canSkip}
          onClick={() => props.onNextTrack()}
          type="button"
        >
          <PlayerIcon
            icon="i-tabler-player-track-next"
            sceneStyle={props.sceneStyle}
            size="size-6"
          />
        </button>
        <PTooltip target={nextTooltip.target()} show={nextTooltip.show()} text={m.player_next()} />
      </div>

      <div class="pomo-player__libraries flex min-w-0 items-center justify-end">
        <VolumeControl sceneStyle={props.sceneStyle} />
        {props.actions}
      </div>
    </div>
  )
}
