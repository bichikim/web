import {Show, useContext} from 'solid-js'
import {SPlayerController, SPlayerControllerProps} from './SPlayerController'
import {MidiPlayerContext} from './context'

export interface SPlayerProps
  extends Omit<SPlayerControllerProps, 'onSelect' | 'onSelect' | 'onSuspend'> {
  isShow?: boolean
}

/**
 * MIDI Player Component
 *
 * A player component for playing and controlling MIDI files.
 * Provides functionality for playlist management, repeat playback, pause/resume etc.
 *
 * @example
 * ```tsx
 * <SPlayer
 *   initMusics={[]}
 *   pianoController={pianoController}
 *   pianoState={pianoState}
 *   onMusicsChange={(musics) => console.log('Playlist changed:', musics)}
 * />
 * ```
 *
 * @param props {SPlayerProps} The props for the player component
 * @prop {MusicInfo[]} [initMusics] - Initial playlist of music files
 * @prop {boolean} [isHidden] - Whether the player should be hidden
 * @prop {(musics: MusicInfo[]) => void} [onMusicsChange] - Callback fired when playlist changes
 * @prop {() => void} [onSetting] - Callback fired when settings button is clicked
 * @prop {SplendidGrandPianoController} [pianoController] - Piano controller instance
 * @prop {SplendidGrandPianoState} [pianoState] - Current state of the piano
 */
export const SPlayer = (props: SPlayerProps) => {
  const {
    handleAddPlayItem,
    handleChangeRepeat,
    handleDelete,
    handlePlay,
    handleResume,
    handleSeek,
    handleSelect,
    handleStop,
    handleSuspend,
    isSuspend,
    playedTime,
    playingId,
    totalDuration,
    selectedId,
    playList,
    repeat,
  } = useContext(MidiPlayerContext)

  return (
    <SPlayerController
      {...props}
      playedTime={playedTime()}
      repeat={repeat()}
      totalDuration={totalDuration()}
      playList={playList()}
      playingId={playingId()}
      isSuspend={isSuspend()}
      selectedId={selectedId()}
      onSuspend={handleSuspend}
      onStop={handleStop}
      onDeleteItem={handleDelete}
      onResume={handleResume}
      onAddItem={handleAddPlayItem}
      onSelect={handleSelect}
      onPlay={handlePlay}
      onSeek={handleSeek}
      onSetting={props.onSetting}
      onChangeRepeat={handleChangeRepeat}
    />
  )
}
