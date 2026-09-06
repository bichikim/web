import {TrackSummary} from './music-player-view/TrackSummary'
import 'media-chrome'
import {cx} from 'class-variance-authority'
import {For, Show} from 'solid-js'
import {getPomoIconClass} from './icon-style'
import type {PSceneStyle} from '../features/focus-room-animation'
import * as m from '@paraglide/message'
import {PAlbumLibrary} from './PAlbumLibrary'
import {PPlayerUtilityButton} from './PPlayerUtilityButton'
import {PScribbleFrame} from './scribble/Frame'
import {ExpandedPlayerControls} from './music-player-view/ExpandedControls'
import {ExpandedPlayerProgress} from './music-player-view/ExpandedProgress'
import {SummaryPlayButton} from './music-player-view/SummaryPlayButton'
import {CLASSES, type MusicPlayerViewProps} from './music-player-view/shared'
import {ExpandedSummaryPlayback} from './music-player-view/ExpandedSummaryPlayback'

const SCRIBBLE_MASK_CLASSES = 'pomo-scribble-mask'

const getShellClasses = (sceneStyle?: PSceneStyle) =>
  sceneStyle === 'scribble' ? cx('rounded-none', SCRIBBLE_MASK_CLASSES) : 'rounded-panel'

const getBaseClasses = (sceneStyle?: PSceneStyle) =>
  sceneStyle === 'scribble' ? 'rounded-none border-transparent' : 'rounded-panel border-border'

export const MusicPlayerView = (props: MusicPlayerViewProps) => (
  <div
    class={cx(
      'pomo-player-stage absolute inset-x-4',
      'bottom-player-bottom-mobile',
      'xs:inset-x-auto xs:bottom-6 xs:left-6 xs:w-[min(29rem,calc(100vw-3rem))]',
    )}
  >
    <div
      class="pomo-player-frame relative w-full overflow-visible [&[data-expanded=true]]:h-full"
      data-expanded={props.expanded}
    >
      <media-controller
        audio=""
        class={cx(
          CLASSES.player,
          CLASSES.playerShell,
          'relative w-full px-2 pt-2 pb-0.5',
          props.expanded ? 'h-full overflow-visible' : 'overflow-hidden',
          getShellClasses(props.sceneStyle),
        )}
      >
        <audio
          {...props.mediaEvents}
          crossorigin="anonymous"
          preload="metadata"
          ref={(element) => props.onAudioElement(element)}
          slot="media"
          src={props.currentTrack?.source}
        />

        <div
          aria-hidden="true"
          class={cx(
            CLASSES.playerBase,
            'border border-solid backdrop-blur-surface pointer-events-none absolute inset-0',
            getBaseClasses(props.sceneStyle),
          )}
        />

        <div
          class={cx(
            'pomo-player__visualizer-frame pointer-events-none absolute inset-x-0 top-0',
            'overflow-hidden',
            props.expanded ? 'h-18 rounded-t-panel' : 'bottom-0 rounded-panel',
          )}
        >
          <div
            aria-label={m.player_audio_levels()}
            class={cx(CLASSES.playerVisualizer, 'absolute flex items-end gap-0.5')}
          >
            <For each={props.levels}>
              {(level) => (
                <span
                  aria-hidden="true"
                  class={cx(
                    CLASSES.level,
                    'min-w-0 flex-1 rounded-t-full [height:var(--pomo-level-height)]',
                    'transition-[height,opacity] duration-75',
                    props.isPlaying ? 'opacity-76' : 'opacity-34',
                  )}
                  style={{'--pomo-level-height': `${level}%`}}
                />
              )}
            </For>
          </div>
        </div>

        <media-time-range
          aria-hidden="true"
          class={cx(
            CLASSES.playerProgress,
            CLASSES.playerProgressCollapsed,
            props.expanded && 'is-hidden',
          )}
          bool:disabled={true}
        />

        <div class={CLASSES.playerSummary}>
          <Show when={!props.expanded}>
            <SummaryPlayButton
              isPlaying={props.isPlaying}
              currentTrack={props.currentTrack}
              sceneStyle={props.sceneStyle}
            />
          </Show>
          <Show when={props.expanded}>
            <ExpandedSummaryPlayback
              isPlaying={props.isPlaying}
              currentTrack={props.currentTrack}
              sceneStyle={props.sceneStyle}
            />
          </Show>

          <TrackSummary currentTrack={props.currentTrack} />

          <PAlbumLibrary
            onAddTracks={(tracks) => props.onAlbumAdd?.(tracks)}
            onClearTracks={props.onAlbumClear}
            onPreviewEnd={props.onPreviewEnd}
            onPreviewStart={props.onPreviewStart}
            sceneStyle={props.sceneStyle}
            tracks={props.tracks}
          />

          <PPlayerUtilityButton
            accessibleLabel={props.expanded ? m.player_collapse() : m.player_expand()}
            expanded={props.expanded}
            icon={getPomoIconClass(
              props.expanded ? 'i-tabler-chevron-down' : 'i-tabler-chevron-up',
              props.sceneStyle,
            )}
            onPress={() => props.onExpandedChange()}
            purpose="expand"
          />
        </div>

        <ExpandedPlayerProgress expanded={props.expanded} />

        <div
          aria-hidden={props.expanded ? undefined : 'true'}
          class={cx(CLASSES.playerExpandedFrame, props.expanded && 'is-expanded')}
          inert={!props.expanded}
        >
          <div class={cx(CLASSES.playerExpandedInner, props.expanded && 'is-expanded')}>
            <ExpandedPlayerControls
              isPlaying={props.isPlaying}
              currentIndex={props.currentIndex}
              currentTrack={props.currentTrack}
              onNextTrack={props.onNextTrack}
              onPreviousTrack={props.onPreviousTrack}
              onRepeatModeChange={props.onRepeatModeChange}
              onShuffleChange={props.onShuffleChange}
              onTrackRemove={props.onTrackRemove}
              onTrackSelect={props.onTrackSelect}
              repeatMode={props.repeatMode}
              sceneStyle={props.sceneStyle}
              shuffleEnabled={props.shuffleEnabled}
              tracks={props.tracks}
            />

            <div aria-hidden="true" class="h-1.5 flex-none" />
          </div>
        </div>
      </media-controller>
      <Show when={props.sceneStyle === 'scribble'}>
        <PScribbleFrame class="pomo-player__scribble-border" />
      </Show>
    </div>
  </div>
)
