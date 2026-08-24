import {cx} from 'class-variance-authority'
import {PPlaybackModes} from '../PPlaybackModes'
import {PScribbleCircleControl} from '../PScribbleCircleControl'
import {PTrackList} from '../PTrackList'
import {PlayerIcon} from './Icon'
import {CLASSES, MusicPlayerViewProps} from './shared'

const SKIP_BUTTON_CLASSES = [
  'pomo-player__skip grid size-10 shrink-0 place-items-center rounded-full transition',
  'disabled:opacity-35 player-compact:size-9',
].join(' ')

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
        'player-compact:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]',
        'player-compact:gap-y-2 player-compact:px-0',
      )}
    >
      <div class="min-w-0 player-compact:col-start-1 player-compact:row-start-2">
        <PPlaybackModes
          onRepeatModeChange={props.onRepeatModeChange}
          onShuffleChange={props.onShuffleChange}
          repeatMode={props.repeatMode}
          sceneStyle={props.sceneStyle}
          shuffleEnabled={props.shuffleEnabled}
        />
      </div>

      <div
        class={cx(
          'pomo-player__transport flex items-center justify-center gap-1',
          'player-compact:col-span-2 player-compact:col-start-1 player-compact:row-start-1',
        )}
      >
        <button
          aria-label="이전 곡"
          class={SKIP_BUTTON_CLASSES}
          disabled={props.tracks.length < 2}
          onClick={() => props.onPreviousTrack()}
          title="이전 곡"
          type="button"
        >
          <PlayerIcon
            icon="i-tabler-player-track-prev"
            sceneStyle={props.sceneStyle}
            size="size-4"
          />
        </button>
        <PScribbleCircleControl
          class="pomo-player__play-scribble-frame"
          enabled={props.sceneStyle === 'scribble'}
        >
          <media-play-button
            aria-label="재생 또는 일시 정지"
            class={cx(CLASSES.playerPlay, CLASSES.playerPlayLarge, 'player-compact:size-12')}
            disabled={!props.currentTrack}
            notooltip
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
        <button
          aria-label="다음 곡"
          class={SKIP_BUTTON_CLASSES}
          disabled={props.tracks.length < 2}
          onClick={() => props.onNextTrack()}
          title="다음 곡"
          type="button"
        >
          <PlayerIcon
            icon="i-tabler-player-track-next"
            sceneStyle={props.sceneStyle}
            size="size-4"
          />
        </button>
      </div>

      <div
        class={cx(
          'pomo-player__volume-group flex min-w-0 items-center justify-end gap-0',
          'player-compact:col-start-2 player-compact:row-start-2',
        )}
      >
        <media-mute-button
          aria-label="음소거"
          class={CLASSES.playerMute}
          notooltip
          title="음소거 켜기/끄기"
        >
          <PlayerIcon
            icon="i-tabler-volume-off"
            sceneStyle={props.sceneStyle}
            size="size-5"
            slot="off"
          />
          <PlayerIcon
            icon="i-tabler-volume-4"
            sceneStyle={props.sceneStyle}
            size="size-5"
            slot="low"
          />
          <PlayerIcon
            icon="i-tabler-volume-2"
            sceneStyle={props.sceneStyle}
            size="size-5"
            slot="medium"
          />
          <PlayerIcon
            icon="i-tabler-volume"
            sceneStyle={props.sceneStyle}
            size="size-5"
            slot="high"
          />
        </media-mute-button>
        <media-volume-range aria-label="음량 조절" class={CLASSES.playerVolume} title="음량 조절" />
      </div>
    </div>

    <PTrackList
      currentIndex={props.currentIndex}
      onTrackRemove={props.onTrackRemove}
      onTrackSelect={props.onTrackSelect}
      tracks={props.tracks}
    />
  </div>
)
