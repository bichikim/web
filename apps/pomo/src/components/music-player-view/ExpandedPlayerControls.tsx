import {type JSX, Show} from 'solid-js'
import {useTooltipTrigger} from '../tooltip'
import {PTooltip} from '../p-tooltip/PTooltip'
import {cx} from 'class-variance-authority'
import * as m from '@paraglide/message'
import {PPlaybackModes} from './PPlaybackModes'
import {PScribbleCircleControl} from '../scribble/CircleControl'
import {PlayerIcon} from './PlayerIcon'
import {CLASSES} from './styles'
import type {MusicPlayerViewProps} from './types'
import {VolumeControl} from './VolumeControl'

const SKIP_BUTTON_CLASSES = cx(
  'grid size-10 shrink-0 place-items-center rounded-full transition',
  'disabled:opacity-35 player-compact:size-9',
)

interface ExpandedMainPlayButtonProps extends Pick<
  MusicPlayerViewProps,
  'isPlaying' | 'isPreparing' | 'sceneStyle'
> {
  readonly hasTrack: boolean
  readonly onPause?: () => void
}

const ExpandedMainPlayButton = (props: ExpandedMainPlayButtonProps) => {
  const playTooltip = useTooltipTrigger()
  const isPauseAction = () => props.isPlaying || props.isPreparing
  return (
    <>
      <Show
        when={props.isPreparing}
        fallback={
          <media-play-button
            ref={playTooltip.setTarget}
            aria-label={isPauseAction() ? m.player_pause() : m.player_play()}
            class={cx(CLASSES.playerPlay, CLASSES.playerPlayLarge)}
            disabled={!props.hasTrack}
            onBlur={playTooltip.onBlur}
            onFocus={playTooltip.onFocus}
            onPointerDown={playTooltip.onPointerDown}
            onPointerEnter={playTooltip.onPointerEnter}
            onPointerLeave={playTooltip.onPointerLeave}
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
          ref={playTooltip.setTarget}
          aria-busy="true"
          aria-label={m.player_pause()}
          class={cx(
            CLASSES.playerPlay,
            CLASSES.playerPlayLarge,
            'relative grid shrink-0 place-items-center rounded-full border-0 p-0',
          )}
          disabled={!props.hasTrack || props.onPause === undefined}
          onBlur={playTooltip.onBlur}
          onClick={() => props.onPause?.()}
          onFocus={playTooltip.onFocus}
          onPointerDown={playTooltip.onPointerDown}
          onPointerEnter={playTooltip.onPointerEnter}
          onPointerLeave={playTooltip.onPointerLeave}
          type="button"
        >
          <PlayerIcon icon="i-tabler-player-pause" sceneStyle={props.sceneStyle} size="size-6" />
        </button>
      </Show>
      <PTooltip
        target={playTooltip.target()}
        show={playTooltip.show()}
        text={isPauseAction() ? m.player_pause() : m.player_play()}
      />
    </>
  )
}

interface ExpandedPlayerControlsProps extends Pick<
  MusicPlayerViewProps,
  | 'canNavigateNextTrack'
  | 'canNavigatePreviousTrack'
  | 'isPreparing'
  | 'isPlaying'
  | 'onNextTrack'
  | 'onPreviousTrack'
  | 'onRepeatModeChange'
  | 'onShuffleChange'
  | 'repeatMode'
  | 'sceneStyle'
  | 'shuffleEnabled'
> {
  readonly hasTrack: boolean
  readonly onPause?: () => void
  readonly actions?: JSX.Element
}

export const ExpandedPlayerControls = (props: ExpandedPlayerControlsProps) => {
  const previousTooltip = useTooltipTrigger()
  const nextTooltip = useTooltipTrigger()
  return (
    <div
      class={cx(
        'grid min-w-0 flex-none grid-cols-[1fr_auto_1fr]',
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

      <div class="flex items-center justify-center gap-1">
        <button
          ref={previousTooltip.setTarget}
          aria-label={m.player_previous()}
          class={SKIP_BUTTON_CLASSES}
          disabled={!props.canNavigatePreviousTrack}
          onClick={() => props.onPreviousTrack()}
          onBlur={previousTooltip.onBlur}
          onFocus={previousTooltip.onFocus}
          onPointerDown={previousTooltip.onPointerDown}
          onPointerEnter={previousTooltip.onPointerEnter}
          onPointerLeave={previousTooltip.onPointerLeave}
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
          class="player-compact:hidden"
          enabled={props.sceneStyle === 'scribble'}
        >
          <ExpandedMainPlayButton
            hasTrack={props.hasTrack}
            isPlaying={props.isPlaying}
            isPreparing={props.isPreparing}
            onPause={props.onPause}
            sceneStyle={props.sceneStyle}
          />
        </PScribbleCircleControl>

        <button
          ref={nextTooltip.setTarget}
          aria-label={m.player_next()}
          class={SKIP_BUTTON_CLASSES}
          disabled={!props.canNavigateNextTrack}
          onClick={() => props.onNextTrack()}
          onBlur={nextTooltip.onBlur}
          onFocus={nextTooltip.onFocus}
          onPointerDown={nextTooltip.onPointerDown}
          onPointerEnter={nextTooltip.onPointerEnter}
          onPointerLeave={nextTooltip.onPointerLeave}
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

      <div class="flex min-w-0 items-center justify-end">
        <VolumeControl sceneStyle={props.sceneStyle} />
        {props.actions}
      </div>
    </div>
  )
}
