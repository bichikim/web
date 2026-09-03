import {cx} from 'class-variance-authority'
import * as m from '@paraglide/message'
import {PPlaybackModes} from './PlaybackModes'
import {PScribbleCircleControl} from '../scribble/CircleControl'
import {PTrackList} from './TrackList'
import {PlayerIcon} from './Icon'
import {CLASSES, MusicPlayerViewProps} from './shared'
import {VolumeControl} from './VolumeControl'

const SKIP_BUTTON_CLASSES = cx(
  'pomo-player__skip grid size-10 shrink-0 place-items-center rounded-full transition',
  'disabled:opacity-35 player-compact:size-9',
)

type ExpandedPlayerControlsProps = Pick<
  MusicPlayerViewProps,
  | 'currentIndex'
  | 'currentTrack'
  | 'onNextTrack'
  | 'onPreviousTrack'
  | 'onRepeatModeChange'
  | 'onShuffleChange'
  | 'onTrackRemove'
  | 'onTrackSelect'
  | 'repeatMode'
  | 'sceneStyle'
  | 'shuffleEnabled'
  | 'tracks'
>

export const ExpandedPlayerControls = (props: ExpandedPlayerControlsProps) => (
  <div
    class={cx(
      CLASSES.playerExpanded,
      'relative px-2 pb-2',
      'pt-3 rounded-b-panel-inner player-compact:pt-2',
    )}
  >
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
          aria-label={m.player_previous()}
          class={SKIP_BUTTON_CLASSES}
          disabled={props.tracks.length < 2}
          onClick={() => props.onPreviousTrack()}
          type="button"
        >
          <PlayerIcon
            icon="i-tabler-player-track-prev"
            sceneStyle={props.sceneStyle}
            size="size-6"
          />
        </button>
        <PScribbleCircleControl
          class="pomo-player__play-scribble-frame pomo-player__transport-play-frame
            player-compact:hidden"
          enabled={props.sceneStyle === 'scribble'}
        >
          <media-play-button
            aria-label={m.player_toggle_playback()}
            class={cx(CLASSES.playerPlay, CLASSES.playerPlayLarge)}
            disabled={!props.currentTrack}
            notooltip
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
        </PScribbleCircleControl>
        <button
          aria-label={m.player_next()}
          class={SKIP_BUTTON_CLASSES}
          disabled={props.tracks.length < 2}
          onClick={() => props.onNextTrack()}
          type="button"
        >
          <PlayerIcon
            icon="i-tabler-player-track-next"
            sceneStyle={props.sceneStyle}
            size="size-6"
          />
        </button>
      </div>

      <VolumeControl sceneStyle={props.sceneStyle} />
    </div>

    <PTrackList
      currentIndex={props.currentIndex}
      onTrackRemove={props.onTrackRemove}
      onTrackSelect={props.onTrackSelect}
      tracks={props.tracks}
    />
  </div>
)
