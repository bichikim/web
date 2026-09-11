import {cx} from 'class-variance-authority'
import {PAlbumLibrary} from './PAlbumLibrary'
import {ExpandedPlayerControls} from './music-player-view/ExpandedPlayerControls'
import {Frame} from './music-player-view/Frame'
import {PTrackList} from './music-player-view/PTrackList'
import {SoundEffects} from './music-player-view/SoundEffects'
import {CLASSES} from './music-player-view/styles'
import type {MusicPlayerViewProps} from './music-player-view/types'

/** Pomo 화면에 주 플레이어, 앨범 선택과 음악 목록을 배치한다. */
export const MusicPlayerView = (props: MusicPlayerViewProps) => {
  return (
    <div
      class={cx(
        'pomo-player-stage absolute inset-x-4 bottom-player-bottom-mobile',
        'xs:inset-x-auto xs:bottom-6 xs:left-6 xs:w-[min(29rem,calc(100vw-3rem))]',
      )}
    >
      <Frame
        currentTrack={props.currentTrack}
        expanded={props.expanded}
        isPlaying={props.isPlaying}
        levels={props.levels}
        onExpandedChange={props.onExpandedChange}
        sceneStyle={props.sceneStyle}
        summaryActions={
          <PAlbumLibrary
            onAddTracks={(tracks) => props.onAlbumAdd?.(tracks)}
            onClearTracks={props.onAlbumClear}
            onPreviewEnd={props.onPreviewEnd}
            onPreviewStart={props.onPreviewStart}
            sceneStyle={props.sceneStyle}
            tracks={props.tracks}
          />
        }
        expandedContent={
          <div
            class={cx(
              CLASSES.playerExpanded,
              'relative px-2 pb-2',
              'pt-3 rounded-b-panel-inner player-compact:pt-2',
            )}
          >
            <ExpandedPlayerControls
              canSkip={props.tracks.length > 1}
              hasTrack={props.currentTrack !== undefined}
              isPlaying={props.isPlaying}
              onNextTrack={props.onNextTrack}
              onPreviousTrack={props.onPreviousTrack}
              onRepeatModeChange={props.onRepeatModeChange}
              onShuffleChange={props.onShuffleChange}
              repeatMode={props.repeatMode}
              sceneStyle={props.sceneStyle}
              shuffleEnabled={props.shuffleEnabled}
              actions={
                <>
                  <PAlbumLibrary
                    onAddTracks={(tracks) => props.onAlbumAdd?.(tracks)}
                    onClearTracks={props.onAlbumClear}
                    onPreviewEnd={props.onPreviewEnd}
                    onPreviewStart={props.onPreviewStart}
                    sceneStyle={props.sceneStyle}
                    tracks={props.tracks}
                  />
                  <SoundEffects sceneStyle={props.sceneStyle} />
                </>
              }
            />
            <PTrackList
              currentIndex={props.currentIndex}
              onTrackRemove={props.onTrackRemove}
              onTrackSelect={props.onTrackSelect}
              tracks={props.tracks}
            />
          </div>
        }
      />
    </div>
  )
}
