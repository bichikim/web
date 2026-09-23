import type {Accessor, ParentProps} from 'solid-js'
import type {MusicInfo} from './SFileItem'
import type {SplendidGrandPianoController, SplendidGrandPianoState} from 'src/use/instruments'
import {DrumMachine} from 'smplr'

export type SampleStart = Parameters<DrumMachine['start']>[0]

export type RepeatType = 'no' | 'all' | 'one'

export interface MidiPlayerContextProps {
  handleAddPlayItem: (musics: MusicInfo[]) => void
  handleChangeRepeat: (value: RepeatType) => void
  handleDelete: (id: string) => void
  /**
   * Play the music
   * if id is not provided, play selected music
   * @param id - The id of the music to play
   */
  handlePlay: (id?: string) => void
  handleResume: () => void
  handleSeek: (time: number) => void
  handleSelect: (id: string) => void
  handleStop: () => void
  handleSuspend: () => void
  handleTryRepeat: () => void
  isPlaying: Accessor<boolean>
  isSuspend: Accessor<boolean>
  playList: Accessor<MusicInfo[]>
  playedTime: Accessor<number>
  playingId: Accessor<string>
  repeat: Accessor<RepeatType>
  selectedId: Accessor<string>
  totalDuration: Accessor<number>
}

export interface MidiPlayerProviderProps extends ParentProps {
  initMusics?: MusicInfo[]
  onMusicsChange?: (musics: MusicInfo[]) => void
  onSetting?: () => void
  pianoController?: SplendidGrandPianoController
  playState?: SplendidGrandPianoState
}
