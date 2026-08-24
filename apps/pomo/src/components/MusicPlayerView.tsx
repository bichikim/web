import 'media-chrome'

import {cx} from 'class-variance-authority'
import {For, Show} from 'solid-js'

import {getPomoIconClass} from '../design-system/icon-style'
import type {PSceneStyle} from '../features/focus-room-animation'
import type {PTrack} from '../features/focus-room-audio/focus-room-playlist'
import {ExpandedPlayerControls} from './music-player-view/ExpandedControls'
import {ExpandedPlayerProgress} from './music-player-view/ExpandedProgress'
import {PAlbumLibrary} from './PAlbumLibrary'
import {POverflowMarquee} from './POverflowMarquee'
import {PPlayerUtilityButton} from './PPlayerUtilityButton'
import {PScribbleFrame, SCRIBBLE_MASK_IMAGE} from './PScribbleFrame'
import {SummaryPlayButton} from './music-player-view/SummaryPlayButton'
import {CLASSES, MusicPlayerViewProps} from './music-player-view/shared'

const ACTIVE_VISUALIZER_OPACITY = 0.76
const FALLBACK_TRACK_ARTIST = 'MP3를 연결하면 이곳에서 재생돼요'
const FALLBACK_TRACK_TITLE = '집중 음악을 준비 중이에요'
const IDLE_VISUALIZER_OPACITY = 0.34
const SCRIBBLE_MASK_CLASSES = [
  '[mask-image:var(--pomo-player-scribble-mask)]',
  '[-webkit-mask-image:var(--pomo-player-scribble-mask)]',
  '[mask-mode:alpha] [mask-position:center] [mask-repeat:no-repeat] [mask-size:100%_100%]',
  '[-webkit-mask-position:center] [-webkit-mask-repeat:no-repeat]',
  '[-webkit-mask-size:100%_100%]',
].join(' ')

const getShellClasses = (sceneStyle?: PSceneStyle) =>
  sceneStyle === 'scribble' ? cx('rounded-none', SCRIBBLE_MASK_CLASSES) : 'rounded-panel'
const getBaseClasses = (sceneStyle?: PSceneStyle) =>
  sceneStyle === 'scribble' ? 'rounded-none border-transparent' : 'rounded-panel border-border'

export const MusicPlayerView = (props: MusicPlayerViewProps) => {
  const handleAlbumAdd = (tracks: readonly PTrack[]) => props.onAlbumAdd?.(tracks)

  return (
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
          style={{'--pomo-player-scribble-mask': SCRIBBLE_MASK_IMAGE}}
        >
          <audio
            crossorigin="anonymous"
            preload="metadata"
            ref={props.onAudioElement}
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
              aria-label="오디오 주파수 레벨"
              class={cx(CLASSES.playerVisualizer, 'absolute flex items-end gap-0.5')}
            >
              <For each={props.levels}>
                {(level) => (
                  <span
                    aria-hidden="true"
                    class={cx(
                      CLASSES.level,
                      'min-w-0 flex-1 rounded-t-full transition-[height,opacity] duration-75',
                    )}
                    style={{
                      height: `${level}%`,
                      opacity: props.isPlaying
                        ? ACTIVE_VISUALIZER_OPACITY
                        : IDLE_VISUALIZER_OPACITY,
                    }}
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
            <SummaryPlayButton
              currentTrack={props.currentTrack}
              expanded={props.expanded}
              sceneStyle={props.sceneStyle}
            />

            <div
              class={cx(CLASSES.playerTitle, 'relative min-w-0 flex-1 px-2')}
              data-pomo-player-title=""
            >
              <p class={cx(CLASSES.playerTrackTitle, 'm-0 min-w-0')}>
                <POverflowMarquee text={props.currentTrack?.title ?? FALLBACK_TRACK_TITLE} />
              </p>
              <p class={cx(CLASSES.playerTrackArtist, 'mb-0 mt-0.5 min-w-0')}>
                <POverflowMarquee text={props.currentTrack?.artist ?? FALLBACK_TRACK_ARTIST} />
              </p>
            </div>

            <PAlbumLibrary
              onAddTracks={handleAlbumAdd}
              sceneStyle={props.sceneStyle}
              tracks={props.tracks}
            />

            <PPlayerUtilityButton
              accessibleLabel={props.expanded ? '플레이어 접기' : '플레이어 펼치기'}
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
}
